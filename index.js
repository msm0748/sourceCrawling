const fs = require("fs");
const puppeteer = require("puppeteer");
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

  const PROJECT_FOLDER_NAME = await page.evaluate(() => prompt("폴더명을 입력해주세요.", "양평정원"));
  const URL = await page.evaluate(() => prompt("url을 입력해주세요.", "https://www.yp21.go.kr/ypjeongwon/index.do"));
  await page.goto(URL);

  const mainHostUrl = await page.evaluate(() => {
    return window.location.origin;
  });

  await createMainPage(page, PROJECT_FOLDER_NAME);
  await createScriptFile(page, PROJECT_FOLDER_NAME, mainHostUrl);
  await createCssFile(page, PROJECT_FOLDER_NAME, mainHostUrl);
})();

async function createMainPage(page, PROJECT_FOLDER_NAME) {
  const mainURL = await page.evaluate(() => {
    return window.location.href;
  });

  let mainPagePath = await page.evaluate(() => {
    return window.location.pathname;
  });
  mainPagePath = `${PROJECT_FOLDER_NAME}/site${mainPagePath.slice(0, mainPagePath.lastIndexOf("/"))}`;

  await createFolder(mainPagePath); // 프로젝트 폴더 생성
  await download(mainURL, `${mainPagePath}/index.html`, function () {
    console.log("main page success");
  });
}

async function createScriptFile(page, PROJECT_FOLDER_NAME, mainHostUrl) {
  const scriptURLs = await page.$$eval("script", (links) =>
    links.map((link) => {
      if (link.src !== "") {
        return link.src;
      } else {
        return false;
      }
    })
  );
  await filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, scriptURLs);
  // 스크립트 파일 생성;
  await page.waitForTimeout(1000);
}

async function filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, URLs) {
  for await (const URL of URLs) {
    let forderName = URL.replace(mainHostUrl, "");
    forderName = PROJECT_FOLDER_NAME + forderName.slice(0, forderName.lastIndexOf("/"));
    let fileName = forderName + URL.slice(URL.lastIndexOf("/")); // 파일명.확장자만 추출
    await createFolder(forderName);
    await page.waitForTimeout(1000);
    await download(URL, fileName, function () {
      console.log(`${forderName + fileName} 생성 성공`);
    });
    await page.waitForTimeout(1000);
  }
}

async function createCssFile(page, PROJECT_FOLDER_NAME, mainHostUrl) {
  const mainPageCssURLs = await page.$$eval("link", (links) =>
    links.map((link) => {
      if (link.rel === "stylesheet") {
        return link.href;
      } else {
        return false;
      }
    })
  );
  let nowUrlPath = await page.evaluate(() => {
    return window.location.href;
  });
  const cssURLs = await contentsFilteringURL(page, mainPageCssURLs, mainHostUrl, nowUrlPath);
  await filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, cssURLs);
}

async function pathFiltering(URL, mainHostUrl, nowUrlPath) {
  if (URL[0] === "/") {
    return mainHostUrl + URL;
  } else if (URL.includes("../")) {
    let path = nowUrlPath.slice(0, nowUrlPath.lastIndexOf("/")); // 파일명.확장자 없애기
    let count = URL.split("../").length - 1; // ../ 몇번 들어갔는지 카운트
    for (let i = 0; i < count; i++) {
      path = path.slice(0, path.lastIndexOf("/"));
    }
    path = `${path}/${URL}`;
    return path.replace("../", "");
  } else {
    let path = nowUrlPath.slice(0, nowUrlPath.lastIndexOf("/") + 1);
    return `${path + URL}`;
  }
}

async function contentsFilteringURL(page, URLs, mainHostUrl, nowUrlPath) {
  let data = [];
  for await (const URL of URLs) {
    await page.goto(URL);
    await page.waitForTimeout(1000);
    nowUrlPath = await page.evaluate(() => {
      return window.location.href;
    });
    let contents = await page.$eval("pre", (el) => el.textContent);

    if (contents.includes("@import") || contents.includes("@font-face")) {
      contents = contents.matchAll(/url\(['"](.*?)['"]\)/g);
      Array.from(contents, (x) => data.push(pathFiltering(x[1], mainHostUrl, nowUrlPath)));
    }
  }
  return data;
}

async function download(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
}

async function createFolder(folderName) {
  fs.readdir(folderName, (error) => {
    // uploads 폴더 없으면 생성
    if (error) {
      fs.mkdirSync(folderName, { recursive: true });
      console.log("폴더 생성 성공");
    }
  });
}
