package app.dsh.mobile.pet

import android.content.Context
import android.os.Handler
import android.os.Looper
import app.dsh.mobile.LocaleHelper
import app.dsh.mobile.R

/**
 * 把 dsh-pet-bridge 的事件翻译成「表情 + 气泡 + 工作状态档位」。
 *
 * 动画播放本身不再由这里负责 —— 交给 [PetAnimChain]，避免两套定时器互相打架：
 * 这里只声明"现在是什么工作状态"，链决定播哪一段、播完后怎么轮换/恢复。
 *
 * 时序规则（实测 dsh-pet-bridge 的行为）：
 *  - user/pre 连续到达时，以最新为准；
 *  - post 只代表「一步完成」，没有工具名，不能拼成「已读 xxx」；
 *  - stop 可能来自多个 agent，因此延迟 1.5s 再庆祝，给同回合后续事件留出窗口；
 *  - 引擎被杀时不会再有 stop，由 Service 每 30s 调 [onTick] 兜底回待机。
 */
class PetActionController(
    context: Context,
    private val packProvider: () -> PetPackConfig?,
    private val onWork: (PetAnimChain.WorkSlot?) -> Unit,
    private val onFace: (PetView.Face) -> Unit,
    private val onBubble: (String?) -> Unit,
) {
    private val appCtx = context.applicationContext
    private val handler = Handler(Looper.getMainLooper())

    private var localeCode = LocaleHelper.get(appCtx)
    private var localeCtx: Context = LocaleHelper.wrap(appCtx)

    private var turnActive = false
    private var current: PetView.Face = PetView.Face.IDLE
    private var lastEventAt = 0L
    private var pendingStop: Runnable? = null
    private var pendingAck: Runnable? = null

    fun start() {
        idle()
    }

    fun onEvent(event: PetEvent) {
        cancelPendingStop()
        cancelPendingAck()
        lastEventAt = System.currentTimeMillis()
        when (event.kind) {
            "user" -> {
                turnActive = true
                thinking(event)
            }
            "pre" -> {
                turnActive = true
                working(event)
            }
            "post" -> ack(event)
            "stop" -> {
                turnActive = false
                scheduleStop()
            }
            "error" -> {
                turnActive = false
                error()
            }
            "waiting" -> {
                face(PetView.Face.EXPLORING)
                work(PetAnimChain.WorkSlot.WAITING)
                bubble(event.text ?: pick(TIER_WAITING))
            }
        }
    }

    /** 每 30s 由 Service 调用；引擎不在时把卡住的工作态收回待机。 */
    fun onTick(engineRunning: Boolean) {
        if (current == PetView.Face.IDLE) return
        val stale = System.currentTimeMillis() - lastEventAt > 15 * 60_000L
        if (!engineRunning || stale) {
            turnActive = false
            idle()
        }
    }

    /** 引擎回合是否进行中（漫游/碎碎念据此让路）。 */
    fun isTurnActive(): Boolean = turnActive

    fun reset() {
        cancelPendingStop()
        cancelPendingAck()
        turnActive = false
        idle()
    }

    // ------------------------------------------------------------ 状态

    private fun idle() {
        face(PetView.Face.IDLE)
        work(null)
        bubble(null)
    }

    /** protocol 3：桥侧带 text（dsh-pet 任务详情）时直显，与浏览器宠物同款内容。 */
    private fun thinking(event: PetEvent? = null) {
        face(PetView.Face.THINKING)
        work(PetAnimChain.WorkSlot.THINKING)
        bubble(event?.text ?: pick(TIER_THINKING))
    }

    private fun working(event: PetEvent) {
        // protocol 3：text 优先（dsh-pet 聚合的 todo 任务详情）
        if (!event.text.isNullOrBlank()) {
            face(PetView.Face.WORKING)
            work(PetAnimChain.WorkSlot.WORKING)
            bubble(event.text)
            return
        }
        // 回落文案对齐 dsh-pet web 的 workStatusTexts（六档随机句，不带工具细节）
        face(PetView.Face.WORKING)
        work(PetAnimChain.WorkSlot.WORKING)
        bubble(pick(TIER_WORKING))
    }

    /** 「一步完成」：短暂切到整理的档位，之后自行回到工作 / 空闲。 */
    private fun ack(event: PetEvent? = null) {
        face(PetView.Face.ACK)
        work(PetAnimChain.WorkSlot.RESULT)
        bubble(event?.text ?: pick(TIER_RESULT))
        cancelPendingAck()
        val r = Runnable {
            pendingAck = null
            if (turnActive) {
                face(PetView.Face.WORKING)
                work(PetAnimChain.WorkSlot.WORKING)
                bubble(pick(TIER_WORKING))
            } else {
                idle()
            }
        }
        pendingAck = r
        handler.postDelayed(r, ACK_HOLD_MS)
    }

    private fun scheduleStop() {
        cancelPendingStop()
        val r = Runnable {
            pendingStop = null
            celebrate()
        }
        pendingStop = r
        handler.postDelayed(r, STOP_GRACE_MS)
    }

    private fun celebrate() {
        face(PetView.Face.CELEBRATE)
        // 终态：链会播一遍庆祝动画后自动收回随机链
        work(PetAnimChain.WorkSlot.SUCCESS)
        bubble(pick(TIER_SUCCESS))
        cancelPendingStop()
        val r = Runnable {
            pendingStop = null
            idle()
        }
        pendingStop = r
        handler.postDelayed(r, CELEBRATE_HOLD_MS)
    }

    private fun error() {
        face(PetView.Face.ERROR)
        work(PetAnimChain.WorkSlot.ERROR)
        bubble(pick(TIER_ERROR))
        cancelPendingStop()
        val r = Runnable {
            pendingStop = null
            idle()
        }
        pendingStop = r
        handler.postDelayed(r, ERROR_HOLD_MS)
    }

    // ------------------------------------------------------------ 输出

    private fun work(slot: PetAnimChain.WorkSlot?) {
        onWork(slot)
    }

    private fun face(face: PetView.Face) {
        current = face
        onFace(face)
    }

    private fun bubble(text: String?) {
        onBubble(text)
    }

    private fun str(id: Int): String = refreshLocale().getString(id)

    private fun refreshLocale(): Context {
        val code = LocaleHelper.get(appCtx)
        if (code != localeCode) {
            localeCode = code
            localeCtx = LocaleHelper.wrap(appCtx)
        }
        return localeCtx
    }

    /** 从 dsh-pet 六档文案池随机抽一句（与 dsh-pet web 的 workStatusTexts 同源同行为）。 */
    private fun pick(pool: List<String>): String = pool[Random.nextInt(pool.size)]

    private fun cancelPendingStop() {
        pendingStop?.let { handler.removeCallbacks(it) }
        pendingStop = null
    }

    private fun cancelPendingAck() {
        pendingAck?.let { handler.removeCallbacks(it) }
        pendingAck = null
    }

    companion object {
        private const val ACK_HOLD_MS = 1_200L
        private const val STOP_GRACE_MS = 1_500L
        private const val CELEBRATE_HOLD_MS = 2_000L
        private const val ERROR_HOLD_MS = 2_500L

        // dsh-pet web assets/config.jsonc 的 workStatusTexts 原文（六档，随机抽句）。
        // 档位与 /bubble kind 对应：user→0 thinking、pre→1 working、post→2 result、
        // waiting→3、stop→4 success、error→5。dsh-pet 未提供其他语言，此处直用原文。
        private val TIER_THINKING = listOf("正在认真想下一步呢", "让我整理一下思路~", "正在梳理接下来要做什么")
        private val TIER_WORKING = listOf("正在处理任务呢", "这一步正在进行中哦", "正在继续干活呢，别打扰我~")
        private val TIER_RESULT = listOf("这一步处理好啦，接着看下一步", "搞定一步，继续看看哦~")
        private val TIER_WAITING = listOf("需要你确认一下呢", "这里要等你看一下哦", "轮到你来决定啦，等你~")
        private val TIER_SUCCESS = listOf("这一轮搞定啦，真棒！", "任务完成咯，可以摸鱼啦~")
        private val TIER_ERROR = listOf("这一步好像没跑通呢", "刚才的操作遇到点问题哦", "这里卡了一下，再等等你呢")

        private val Random = java.util.Random()
    }
}
