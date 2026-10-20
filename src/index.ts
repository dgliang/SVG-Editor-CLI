#!/usr/bin/env node

import process from 'process';

// 读取命令行参数
const args = process.argv.slice(2);

async function main() {
  console.log("✅ TS CLI 启动成功");
  console.log("收到参数：", args);

  if (args.includes("--help")) {
    console.log(`
使用示例：
  tscli hello
  tscli --help
    `);
    return;
  }
}

main().catch(console.error);
