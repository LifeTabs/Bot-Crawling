import dotenv from "dotenv";
import axios from "axios";
import { sendToWorker, listenerWorker } from "#root/utils/socket.js";
import axiosRetry from "axios-retry";
import { PrismaClient } from "@prisma/client";
import { JSDOM } from "jsdom";

const prisma = new PrismaClient();
dotenv.config();
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
export default {
	async update() {
		listenerWorker(async (data) => {
			const json = JSON.parse(data.toString());
			await prisma.raw_data_wallpapers.update({
				where: {
					id: json.hash
				},
				data: {
					url_image: json.url
				}
			});
			console.log(`Received data from worker: ${JSON.stringify(json)}`);
		});
		const listDetail = await prisma.raw_data_wallpapers.findMany({
			where: {
				is_get_details: false,
			}
		});
		for (const wallpaper of listDetail) {
			console.log(wallpaper.url);
			await new Promise((solver) => {
				setTimeout(async () => {
					const { data, status } = await axios.get(wallpaper.url, {
						validateStatus: (status) => {
							return status >= 200 && status < 300 || status === 404 || status === 403;
						} 
					});
					if(status === 404 || status === 403) {
						solver();
						return;
					}
					const dom = new JSDOM(data);
					const image = dom.window.document.querySelector("#wallpaper");
					const description = image.getAttribute("alt");
					const imageUrl = image.getAttribute("src");
					const solutionDom = dom.window.document.querySelector(".showcase-resolution");
					const resolution = solutionDom.textContent;
					const original_solution = solutionDom.getAttribute("title");
					const tagsDom = dom.window.document.querySelectorAll("#tags>.tag");
					const tags = [];
					tagsDom.forEach((tag) => {
						tags.push({
							tag_id: tag.getAttribute("data-tag-id"),
							tag_original_name: tag.querySelector("a").getAttribute("title"),
							tag_name:	tag.querySelector("a").textContent,
						});
					});
					const property = dom.window.document.querySelector("div[data-storage-id='showcase-info']");
					let views = 0;
					let likes = 0;
					property.querySelectorAll("dt").forEach((dt) => {
						if(dt.textContent == "Views") {
							views = parseInt(dt.nextElementSibling.textContent.replace(",",""));
						}
						else if(dt.textContent == "Favorites") {
							likes = parseInt(dt.nextElementSibling.textContent.replace(",",""));
						}
					});
					sendToWorker({
						hash: wallpaper.id,
						url: imageUrl
					});
					const res = await prisma.raw_data_wallpapers.update({
						where: {
							id: wallpaper.id,
						},
						data: {
							tags,
							description,
							resolution,
							original_solution,
							likes,
							views,
							is_get_details: true,
						}
					});
					console.log(res);
					solver();
				},3000);
			});
		}
	}
};