import hot from "./wallhaven/hot.js";
import top from "./wallhaven/top.js";

const crawl = async () => {
	await hot.crawl();
	await top.crawl();
};
crawl();