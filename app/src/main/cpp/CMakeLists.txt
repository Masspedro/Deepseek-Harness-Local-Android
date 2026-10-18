# dsh-android PTY 原生层
cmake_minimum_required(VERSION 3.22.1)
project(dshpty C)

add_library(dshpty SHARED dsh_pty.c)

# dsh_pty_exec（roadmap M2）：终端用的 PTY 执行助手。
# 引擎内的 Web 终端与持久 bash 工具经 node-pty 申请伪终端，而 node-pty 在
# Android 无预编译产物 —— 这个**独立可执行文件**就是补上来的后端：引擎侧
# node-pty 兼容层 spawn 它，它再 fork 挂 PTY 的 shell 并双向搬运字节。
#
# ⚠️ 产物名刻意写成 lib*.so：AGP 只把 CMake 输出里的 *.so 当原生库收进 APK
# （裸名字会被忽略）。App 启动时从自己的 APK 里读出这个条目、落到
# engine/bin/dsh_pty_exec 并 chmod +x —— targetSdk 28 豁免 W^X，可以直接 execve。
add_executable(dsh_pty_exec dsh_pty_exec.c)
set_target_properties(dsh_pty_exec PROPERTIES OUTPUT_NAME "libdsh_pty_exec.so")

# 16KB 页对齐：Android 15+ 部分 aarch64 真机内核使用 16384 字节页，
# LOAD p_align=4096 的 so 在其上 dlopen 会报 "program alignment" 失败。
# 不依赖 NDK r27+ 的默认行为，对所有 ndkVersion 显式生效。
target_link_options(dshpty PRIVATE
    "-Wl,-z,max-page-size=16384")
target_link_options(dsh_pty_exec PRIVATE
    "-Wl,-z,max-page-size=16384")

target_link_libraries(dshpty
    # 仅依赖 log，无 STL —— 纯 C11 实现，规避 NDK STL 兼容问题
    log)
