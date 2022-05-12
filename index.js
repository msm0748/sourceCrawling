const fs = require("fs");
const puppeteer = require("puppeteer");
const url = require("url");
const request = require("request");

(async function startCrawling() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1920,1080"],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  const projectrName = await page.evaluate(() => prompt("폴더명을 입력해주세요.", "양평정원"));
  const urlName = await page.evaluate(() =>
    prompt("url을 입력해주세요.", "https://www.yp21.go.kr/ypjeongwon/index.do")
  );
  //   await createFolder(projectrName + "/site");
  await page.goto(urlName);

  const mainUrl = await page.evaluate(() => {
    return window.location.href;
  });
  let mainPath = url.parse(mainUrl, true).pathname;
  mainPath = `/site${mainPath.slice(0, mainPath.lastIndexOf("/"))}`;
  await createMainPage(mainUrl, mainPath, projectrName);
  const hostUrl = url.parse(mainUrl, true).hostname;

  const number = await page.$$eval("script", (data) => data.length);
  let temp = await page.evaluate(() => {
    return document.getElementsByClassName("script");
  });
  console.log(temp);
  //   for (let i = 0; i < 10; i++) {
  //     let temp = await page.$$("script")._remoteObject;
  //     console.log(temp);
  //   }
  //   console.log(number, temp);
  //   let dataArray = [];
  //   let data = await page.$eval("script", (element) => {
  //     return dataArray.push(element.src);
  //   });
  //   console.log(dataArray);
  //   for (let i = 0; i < number; i++) {
  //     let temp = await page.$(`head > script:nth-child(${i})`);
  //     // let temp = await page.evaluate(() => document.querySelectorAll("script"));
  //     console.log(temp);
  //   }
})();

async function createMainPage(mainUrl, mainPath, projectrName) {
  await createFolder(projectrName + mainPath); // 프로젝트 폴더 생성
  //   console.log(urlPath);
  //   let mainUrl = url.parse(urlPath, true).pathname;
  await download(mainUrl, `${projectrName + mainPath}/index.html`, function () {
    console.log("main success");
  });
  //   mainUrl = `/site/${mainUrl.slice(mainUrl.lastIndexOf("/") + 1, -3)}`;
  //   let contents = await page.$eval("html", (el) => el.outerHTML);
  //   await createFile(projectrName, mainUrl + ".html", contents);
  //   const hostName = url.parse(urlPath, true).hostname;
  //   const selector3rdMenuLength = await page.$("script");
  //   let src = await page.evaluate((data) => {
  //     return data.src;
  //   }, selector3rdMenuLength);
  //   console.log(src);
}

async function download(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    // console.log("content-type:", res.headers["content-type"]);
    // console.log("content-length:", res.headers["content-length"]);
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
}

async function createFolder(folderName) {
  fs.readdir(folderName, (error) => {
    // uploads 폴더 없으면 생성
    if (error) {
      fs.mkdirSync(folderName, { recursive: true });
    }
  });
}

async function createFile(folderName, fileName, contents) {
  console.log(folderName + fileName);
  fs.writeFile(folderName + fileName, contents, function (err) {
    if (err === null) {
      console.log("success");
    } else {
      console.log("fail");
    }
  });
}
