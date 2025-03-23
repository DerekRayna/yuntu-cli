import { select, input, confirm } from "@inquirer/prompts";
import os from "node:os";
import { NpmPackage } from "@yuntu-cli/utils";
import path from "node:path";
import ora from "ora";
import fse from "fs-extra";
import ejs from "ejs";
import { glob } from "glob";

async function create() {
  const projectTemplate = await select({
    message: "请选择项目模版",
    choices: [
      {
        name: "react 项目",
        value: "@yuntu-cli/template-react",
      },
      {
        name: "vue 项目",
        value: "@yuntu-cli/template-vue",
      },
    ],
  });

  let projectName = "";
  while (!projectName) {
    projectName = await input({ message: "请输入项目名" });
  }

  const targetPath = path.join(process.cwd(), projectName);

  if (fse.existsSync(targetPath)) {
    const empty = await confirm({ message: "该目录不为空，是否清空" });
    if (empty) {
      fse.emptyDirSync(targetPath);
    } else {
      process.exit(0);
    }
  }

  const pkg = new NpmPackage({
    name: projectTemplate,
    targetPath: path.join(os.homedir(), ".yuntu-cli-template"),
  });

  if (!(await pkg.exists())) {
    const spinner = ora("下载模版中...").start();
    await sleep(1000);
    await pkg.install();
    spinner.stop();
  } else {
    const spinner = ora("更新模版中...").start();
    await sleep(1000);
    await pkg.update();
    spinner.stop();
  }

  const spinner = ora("创建项目中...").start();
  await sleep(1000);

  const templatePath = path.join(pkg.npmFilePath, "template");

  fse.copySync(templatePath, targetPath);

  spinner.stop();

  const renderData: Record<string, any> = { projectName };
  const deleteFiles: string[] = [];

  const questionConfigPath = path.join(pkg.npmFilePath, "questions.json");

  if (fse.existsSync(questionConfigPath)) {
    const config = fse.readJSONSync(questionConfigPath);

    for (let key in config) {
      const res = await confirm({ message: "是否启用 " + key });
      renderData[key] = res;

      if (!res) {
        deleteFiles.push(...config[key].files);
      }
    }
  }

  const files = await glob("**", {
    cwd: targetPath,
    nodir: true,
    ignore: "node_modules/**",
  });

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(targetPath, files[i]);
    const renderResult = await ejs.renderFile(filePath, renderData);

    fse.writeFileSync(filePath, renderResult);
  }

  deleteFiles.forEach((item) => {
    fse.removeSync(path.join(targetPath, item));
  });
}

function sleep(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

// create();

export default create;
