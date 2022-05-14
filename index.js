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

  const PROJECT_FOLDER_NAME = await page.evaluate(() => prompt("생성하실 폴더명을 입력해주세요.", ""));
  const URL = await page.evaluate(() => prompt("소스를 가져올 url을 입력해주세요.", ""));
  await page.goto(URL);

  const mainHostUrl = await page.evaluate(() => {
    return window.location.origin;
  });

  await createMainPage(page, PROJECT_FOLDER_NAME);
  await createScriptFile(page, PROJECT_FOLDER_NAME, mainHostUrl);
  await createCssFile(page, PROJECT_FOLDER_NAME, mainHostUrl);
  console.log("파일 생성이 완료 되었습니다");
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
    console.log("main page 생성 성공");
  });
}

async function createScriptFile(page, PROJECT_FOLDER_NAME, mainHostUrl) {
  const scriptURLs = await page.$$eval("script", (links) =>
    links.filter((link) => link.src !== "").map((link) => link.src)
  );
  await filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, scriptURLs);
  await page.waitForTimeout(1000);
}

async function filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, URLs) {
  for (let URL of URLs) {
    if (!URL.includes(mainHostUrl)) {
      continue;
    }
    if (URL.includes("?")) {
      URL = URL.slice(0, URL.lastIndexOf("?"));
    }
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
    links.filter((link) => link.rel === "stylesheet").map((link) => link.href)
  );
  let nowUrlPath = await page.evaluate(() => {
    return window.location.href;
  });
  const cssURLs = await contentsFilteringURL(page, mainPageCssURLs, mainHostUrl, nowUrlPath);
  await filteringDownload(page, PROJECT_FOLDER_NAME, mainHostUrl, cssURLs);
}

async function contentsFilteringURL(page, URLs, mainHostUrl, nowUrlPath) {
  let data = [...URLs]; // css main 페이지가 배열로 들어옴, css main 페이지도 목록에 추가
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

function pathFiltering(URL, mainHostUrl, nowUrlPath) {
  if (URL[0] === "/") {
    return mainHostUrl + URL;
  } else if (URL.includes("../")) {
    let path = nowUrlPath.slice(0, nowUrlPath.lastIndexOf("/")); // 파일명.확장자 없애기
    let count = URL.split("../").length - 1; // ../ 몇번 들어갔는지 카운트
    for (let i = 0; i < count; i++) {
      path = path.slice(0, path.lastIndexOf("/"));
    }
    path = `${path}/${URL}`;
    return path.replace(/\.\.\//g, "");
  } else {
    let path = nowUrlPath.slice(0, nowUrlPath.lastIndexOf("/") + 1);
    if (URL.includes("./")) {
      path.replace("./", "");
    }
    return `${path + URL}`;
  }
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
    }
  });
}
