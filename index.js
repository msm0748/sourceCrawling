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

    const projectrName = await page.evaluate(() =>
        prompt("폴더명을 입력해주세요.", "양평정원")
    );
    const urlName = await page.evaluate(() =>
        prompt(
            "url을 입력해주세요.",
            "https://www.yp21.go.kr/ypjeongwon/index.do"
        )
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
    const srcTag = await page.$$eval("script", (links) =>
        links.map((link) => {
            if (link.src !== "") {
                return link.src;
            } else {
                return false;
            }
        })
    );
    // console.log(url.parse(mainUrl, true));
    await page.waitForTimeout(1000);
    for await (const val of srcTag) {
        let forderName = val.replace(`https://${hostUrl}/`, "");
        forderName = forderName.slice(0, forderName.lastIndexOf("/"));
        let fileName = val.slice(val.lastIndexOf("/"));
        await createFolder(`${projectrName}/${forderName}`);
        await page.waitForTimeout(1000);
        await download(
            val,
            `${projectrName}/${forderName + fileName}`,
            function () {
                console.log("sub success");
            }
        );
      await page.waitForTimeout(1000);
        console.log(projectrName + forderName + fileName);
    }
})();

async function createMainPage(mainUrl, mainPath, projectrName) {
    await createFolder(projectrName + mainPath); // 프로젝트 폴더 생성
    await download(
        mainUrl,
        `${projectrName + mainPath}/index.html`,
        function () {
            console.log("main success");
        }
    );
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
        } else {
            console.log("폴더 생성 실패");
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
