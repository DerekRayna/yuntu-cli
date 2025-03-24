import { input } from "@inquirer/prompts";
import path from "node:path";
import OpenAI from "openai";
import fs from "node:fs";
import ora from "ora";
import { cosmiconfig } from "cosmiconfig";
import { ConfigOptions } from "./configType.js";

async function generate() {
  const explorer = cosmiconfig("generate");

  const result = await explorer.search(process.cwd());

  if (!result?.config) {
    console.error("没找到配置文件 generate.config.js");
    process.exit(1);
  }

  const config: ConfigOptions = result.config;

  const systemContent = config.systemSetting

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  let componentDir = "";
  while (!componentDir) {
    componentDir = await input({
      message: "生成组件的目录",
      default: "src/components",
    });
  }

  let componentDesc = "";
  while (!componentDesc) {
    componentDesc = await input({
      message: "组件描述",
      default:
        "生成一个 Table 的 React 组件，有包含 name、age、email 属性的 data 数组参数",
    });
  }

  const spinner = ora("AI代码生成中...").start();

  const res = await client.chat.completions.create({
    model: "qwen-plus",
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: componentDesc },
    ],
  });

  const markdown = res.choices[0].message.content || "";

  // 分割 Markdown 内容
  const sections = markdown.split(/^#\s*(.*)$/m).filter(Boolean);

  // 处理每个部分
  for (let i = 0; i < sections.length; i += 2) {
    const filePath = path.join(componentDir, sections[i].trim());
    const fileContent = sections[i + 1].trim();

    // 创建目录
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(filePath, fileContent, "utf8");
    console.log(`文件 ${filePath} 已生成`);
  }
  spinner.stop();
}

// generate();

export default generate;
