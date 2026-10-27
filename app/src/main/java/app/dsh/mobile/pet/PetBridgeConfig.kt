package app.dsh.mobile.pet

import android.content.Context
import java.io.File

/**
 * dsh-pet-bridge 桥端配置（v0.3.5+）在 App 侧的读写门面。
 *
 * 桥插件通过 Config schema 暴露 `selfPublishRandomLines`（随机词句自发布），
 * dsh 桌面端 web 设置会自动渲染这个开关；但 Android 的窄版设置 UI 不渲染
 * 第三方插件的配置页，所以这里直接读写 profile 的 patch 文件
 * （files/dsh-home/profiles/web/cordis.patch.yml）里 id 为 `pet-bridge` 的
 * 覆盖条目，配合设置页已有的「重启引擎」生效。
 *
 * YAML 只做行级最小操作，绝不重排用户的其他条目：
 *  - 开（默认）：删除 pet-bridge 覆盖条目（缺省即 true，文件保持干净）；
 *  - 关：条目存在就把 `selfPublishRandomLines: false` 写进其 config 块，
 *    不存在就在文件末尾追加一个最小条目。
 */
object PetBridgeConfig {

    /** 桥插件在 bundle patch 里的条目 id（插件包 cordis.patch.yml 的 insert id）。 */
    private const val ENTRY_ID = "pet-bridge"
    private const val PLUGIN_NAME = "@xiaopb/dsh-pet-bridge"
    private const val KEY = "selfPublishRandomLines"

    fun patchFile(ctx: Context): File =
        File(ctx.applicationContext.filesDir, "dsh-home/profiles/web/cordis.patch.yml")

    /** 当前是否让桥端自发布随机词句（文件缺失/无条目 = 默认开）。 */
    fun selfPublishEnabled(ctx: Context): Boolean {
        val text = runCatching { patchFile(ctx).readText() }.getOrNull() ?: return true
        entryBlock(text)?.let { block ->
            val m = Regex("""(?m)^\s*-?\s*${Regex.escape(KEY)}\s*:\s*(true|false)\s*(#.*)?$""")
                .find(block) ?: return true
            return m.groupValues[1] == "true"
        }
        return true
    }

    /**
     * 写入开关。返回 false 表示文件存在但这次没动成功（结构异常时宁可不动，
     * 提示用户走 dsh 设置的「打开配置文件」手改，别帮倒忙）。
     */
    fun setSelfPublish(ctx: Context, enabled: Boolean): Boolean {
        val f = patchFile(ctx)
        val text = runCatching { f.readText() }.getOrNull() ?: return true // 无文件=默认开，无需写
        val lines = text.split('\n')
        val range = entryRange(lines)
        return if (enabled) {
            if (range == null) true // 本来就是默认开
            else {
                // 删除整个覆盖条目，回到缺省 true
                val out = buildList {
                    addAll(lines.subList(0, range.first))
                    addAll(lines.subList(range.last + 1, lines.size))
                }
                writeAtomic(f, join(out))
            }
        } else {
            if (range == null) {
                // 追加最小条目
                val block = listOf(
                    "- id: $ENTRY_ID",
                    "  name: '$PLUGIN_NAME'",
                    "  config:",
                    "    $KEY: false",
                )
                writeAtomic(f, join(lines + block))
            } else {
                // 条目已存在：config 块内已有键就改值，没有就在条目尾部缩进插入
                val block = lines.subList(range.first, range.last + 1)
                val keyRegex = Regex("""^\s*-?\s*${Regex.escape(KEY)}\s*:.*$""")
                val cfgIdx = block.indexOfFirst { it.trimEnd() == "  config:" }
                val keyIdx = block.indexOfFirst { keyRegex.matches(it) }
                val newBlock: List<String> = when {
                    keyIdx >= 0 -> block.mapIndexed { i, l -> if (i == keyIdx) "    $KEY: false" else l }
                    cfgIdx >= 0 -> block.toMutableList().apply { add(cfgIdx + 1, "    $KEY: false") }
                    else -> block + listOf("  config:", "    $KEY: false")
                }
                val out = buildList {
                    addAll(lines.subList(0, range.first))
                    addAll(newBlock)
                    addAll(lines.subList(range.last + 1, lines.size))
                }
                writeAtomic(f, join(out))
            }
        }
    }

    // ------------------------------------------------------------ 行级解析

    /** 找 `- id: pet-bridge` 条目（或 name 指向本插件的条目）的行区间；null=不存在。 */
    private fun entryRange(lines: List<String>): IntRange? {
        val start = lines.indexOfFirst { isEntryHead(it) }
        if (start < 0) return null
        // 条目头是 "- xxx"，后续同级/更深的内容都属于这个条目，直到下一个顶层 "- "
        val bodyIndent = lines[start].indexOfFirst { !it.isWhitespace() }
        var end = start
        for (i in start + 1 until lines.size) {
            val l = lines[i]
            if (l.isBlank()) { end = i; continue }
            val indent = l.indexOfFirst { !it.isWhitespace() }
            if (indent <= bodyIndent && l.trimStart().startsWith("- ")) break
            if (indent <= bodyIndent && !l.trimStart().startsWith("-")) break
            end = i
        }
        // 收掉尾部空行，别把空行算进条目（删除时会整段拿走，留空行给排版）
        while (end > start && lines[end].isBlank()) end--
        return start..end
    }

    private fun isEntryHead(line: String): Boolean {
        val t = line.trimStart()
        if (!t.startsWith("- ")) return false
        val rest = t.substring(2).trim()
        if (rest.startsWith("id:") && rest.substringAfter(':').trim() == ENTRY_ID) return true
        if (rest.startsWith("name:") && rest.substringAfter(':').trim().trim('\'', '"') == PLUGIN_NAME) return true
        return false
    }

    /** 条目块的文本（仅用于读取键值）。 */
    private fun entryBlock(text: String): String? {
        val lines = text.split('\n')
        val r = entryRange(lines) ?: return null
        return lines.subList(r.first, r.last + 1).joinToString("\n")
    }

    private fun join(lines: List<String>): String = lines.joinToString("\n").let {
        if (it.endsWith("\n") || it.isEmpty()) it else it // split/join 保尾换行无需补；统一以 \n 结尾
    }

    private fun writeAtomic(f: File, content: String): Boolean = runCatching {
        val tmp = File(f.parentFile, f.name + ".pet-tmp")
        tmp.writeText(content)
        if (!tmp.renameTo(f)) {
            f.writeText(content)
            tmp.delete()
        }
        true
    }.getOrDefault(false)
}
