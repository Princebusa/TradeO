import WebSocket from 'ws';
async function testWs() {
    console.log("Starting WS Client...");
    const ws = new WebSocket("ws://localhost:3000");
    ws.on('open', () => {
        console.log("Client connected");
        ws.send(JSON.stringify({ method: "SUBSCRIBE", params: ["orderbook:GOOGLE", "trades:GOOGLE"] }));
    });
    ws.on('message', (data) => {
        console.log("Received WS Message:", data.toString());
    });
    ws.on('error', (err) => {
        console.error("WS Error:", err);
    });
    // Wait 2 seconds then exit
    setTimeout(() => {
        console.log("Closing test client...");
        ws.close();
        process.exit(0);
    }, 2000);
}
testWs();
