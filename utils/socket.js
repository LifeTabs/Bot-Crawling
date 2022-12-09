import WebSocket from "ws";
import dotenv from "dotenv";
dotenv.config();
const ws = new WebSocket(process.env.WORKER_SOCKET_ENDPOINT);

const listenerWorker = (callback) => {
	ws.on("message", callback);
};

const waitWorker = new Promise((solver) => {
	ws.on("open", function open() {
		solver();
	});
});

const sendToWorker = (json) => {
	waitWorker.then(() => {
		ws.send(JSON.stringify(json));
	});
};

export {
	sendToWorker,
	listenerWorker,
	ws,
};