import axios from "axios";
import dotenv from "dotenv";
import axiosRetry from "axios-retry";
import { PrismaClient } from "@prisma/client";
import { JSDOM } from "jsdom";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
dotenv.config();
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

axios.interceptors.request.use((config) => {
	return config;
}, (err) => {
	return Promise.reject(err);
});

export default {
	async getCaching(name) {
		return await prisma.bot_memory_caching.upsert({
			where: {
				name,
			},
			create: {
				name,
				data: {
					pageOffset: 1,
				}
			},
			update: {
        
			}
		});
	},
	checkRecordExist (data) {
		return prisma.raw_data_wallpapers.findFirst({
			where: data,
		});
	},
	async crawl() {
		const botMem = await this.getCaching("wallhaven-hot");
		const arrCount = Array.from({length: 500}, (_, i) => i + 1);
		for (const i of arrCount) {
			console.log(`Page: ${i}`);
			if(i < botMem.data.pageOffset) {
				continue;
			}
			prisma.bot_memory_caching.update({
				where: {
					name: "wallhaven-hot",
				},
				data: {
					data: {
						pageOffset: i,
					}
				}
			});
			const page = i;
			const data = await new Promise((solver) => {
				setTimeout(async () => {
					const { data } = await axios.get("https://wallhaven.cc/hot", {
						params: {
							page,
						},
						headers: {
							"x-requested-with": "XMLHttpRequest",
						}
					});
					solver(data);
				}, 3000);
			});
			const dom = new JSDOM(data);
			const list = [...dom.window.document.querySelectorAll("li")];
			if(list.length === 0) {
				console.log("Crawl done!");
				break;
			}
			for (const li of list) {
				const hash = uuidv4();
				const url = li.querySelector("figure>a").getAttribute("href");
				const found = await this.checkRecordExist({
					url,
				});
				if(found) {
					console.log("Record exist!!!!");
					continue;
				}
				console.log(`New record: ${url}`);
				await prisma.raw_data_wallpapers.create({
					data: {
						id: hash,
						url,
					}
				});
			}
		}
	}
};