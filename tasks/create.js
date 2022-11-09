#! /usr/bin/env node

const cp = require("child_process");
const path = require("path");
const fs = require("fs");

const clean = () => {
  console.log("Cleaning up.");
  cp.execSync("git checkout -- packages/*/package.json");
};

const handleExit = () => {
  clean();
  console.log("Exit without error.");
  process.exit();
};

const handleException = (e) => {
  console.log("ERROR! An error was encountered while executing");
  console.log(e);
  clean();
  console.log("Exiting with error.");
  process.exit(1);
};

process.on("SIGINT", handleExit);

process.on("uncaughtException", handleException);

const gitStatus = cp.execSync("git status --porcelain").toString();

if (gitStatus.trim() !== "") {
  console.log("Please commit your change.");
  console.log("Exit because `git status` is not empty");
  process.exit(1);
}

const rootDir = path.join(__dirname, "..");
const packagesDir = path.join(rootDir, "packages");

const packagePathsMap = {};

fs.readdirSync(packagesDir).forEach((name) => {
  const subPackageDir = path.join(packagesDir, name);
  const subPackageJson = path.join(subPackageDir, "package.json");
  if (fs.existsSync(subPackageJson)) {
    packagePathsMap[name] = subPackageDir;
  }
});

/**
 * {                                       {
 *  name：‘’，                                name:'',
 *  dependencies:{                           dependencies:{
 *    otherPackage:'/some/path'   =>           otherPackage:"file:/some/path"
 *  }                                        }
 * }                                       }
 */
Object.keys(packagePathsMap).forEach((name) => {
  const subPackageJson = path.join(packagePathsMap[name], "package.json");
  const json = JSON.parse(fs.readFileSync(subPackageJson), "utf8");

  Object.keys(packagePathsMap).forEach((nextName) => {
    if (json.dependencies && json.dependencies[nextName]) {
      json.dependencies[nextName] = "file:" + packagePathsMap[nextName];
    }
    if (json.devDependencies && json.devDependencies[nextName]) {
      json.devDependencies[nextName] = "file:" + packagePathsMap[nextName];
    }
    if (json.peerDependencies && json.peerDependencies[nextName]) {
      json.devDependencies[nextName] = "file:" + packagePathsMap[nextName];
    }
    if (json.optionalDependencies && json.optionalDependencies[nextName]) {
      json.devDependencies[nextName] = "file:" + packagePathsMap[nextName];
    }
  });

  fs.writeFileSync(subPackageJson, JSON.stringify(json, null, 2), "utf8");
  console.log(
    "Replace local dependencies in package/" + name + "/package.json"
  );
});

console.log("Replaced all local dependencies for testing.");
console.log("Don't do anything while this task is running.");

// output is .tgz filename.
const scriptsFileName = cp
  .execSync("npm pack", {
    cwd: path.join(packagesDir, "ccws-scripts"),
  })
  .toString()
  .trim();

const scriptTarPath = path.join(packagesDir, "ccws-scripts", scriptsFileName);

const args = process.argv.slice(2);

// run the script
const scriptPath = path.join(packagesDir, "create-ccws", "index.js");

cp.execSync(
  `node ${scriptPath} ${args.join(" ")} --script-version="${scriptTarPath}"`,
  { cwd: rootDir, stdio: "inherit" }
);

// clean

handleExit();
