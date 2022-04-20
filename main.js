/**
 * A way to alert Joel to events such as dinner, going to bed, taking out the trash, etc.
 * 
 * @author Adam Koch (aakoch)
 */

// Setup: you might need to run the IDF setup:
// cd $IDF_PATH
// ./install.sh
// . ./export.sh

// export UPLOAD_PORT=/dev/cu.usbserial-0001

// Things we need:
//   - a way to call the device, maybe a webserver, Bluetooth, other?
//   - a way for him to acknowledge the notification because if he doesn't....
//   - I want to make the color change or get brighter or something
//   - perhaps a way to sleep?

import {} from "piu/MC";
import {Server} from "http"
import Net from "net";
import { rgb, rgba, hsl, hsla } from "piu/All";

const color1 = rgb(36, 47, 64)
const color2 = 0x6E8894
const color3 = 0x85BAA1
const color4 = 0xCEEDDB
const color5 = 0xF4989C

let server = new Server({port: 80});

const sampleStyle = new Style({ font:"20px Open Sans", color: color4, horizontal:"left" });

class ChangingBackgroundBehavior extends Behavior {
	onTouchBegan(content) {
		this.startColor = [0xF4, 0x98, 0x9C]
		this.color = [0xF4, 0x98, 0x9C]
		content.interval = 5;
		content.duration = 1000;
		content.time = 0;
		content.start();
	}
	onTimeChanged(content) {
		trace(`duration=${content.duration}, time=${content.time}, fraction=${content.fraction}, interval=${content.interval}\n`)
		let fraction = 1 - content.fraction;

		const endColor = [0x24, 0x2F, 0x40]

		trace(`Math.abs(this.startColor[0] - endColor[0])=${Math.abs(this.startColor[0] - endColor[0])}\n`)
		trace(`Math.abs(this.startColor[0] - endColor[0]) * fraction=${Math.abs(this.startColor[0] - endColor[0]) * fraction}\n`)
		trace(`Math.abs(this.startColor[0] - endColor[0]) * fraction + this.color[0]=${Math.abs(this.startColor[0] - endColor[0]) * fraction + this.color[0]}\n`)

		const newColor = [
			Math.abs(this.startColor[0] - endColor[0]) * fraction,
			Math.abs(this.startColor[1] - endColor[1]) * fraction,
			Math.abs(this.startColor[2] - endColor[2]) * fraction
		]

		trace(`newColor=${newColor}\n`)

		// if (fraction > 0.5) fraction = 1-fraction;
		// fraction *= 255;
		this.color = rgb(newColor[0], newColor[1], newColor[2])

		trace(`color=${this.color}\n`)
		content.skin = new Skin( {fill: this.color})
	}
	onFinished(content) {
		// let startingSize = this.startingSize;
		// content.height = startingSize.h;
		// content.width = startingSize.w;
	}
}

class ExpandingBehavior extends Behavior {
	onTouchBegan(content) {
		this.startingSize = { h: content.height, w: content.width };
		content.interval = 5;
		content.duration = 100;
		content.time = 0;
		content.start();
	}
	onTimeChanged(content) {
		let startingSize = this.startingSize;
		let fraction = content.fraction;
		if (fraction > 0.5) fraction = 1-fraction;
		fraction *= 20;
		content.height = startingSize.h + fraction;
		content.width = startingSize.w + fraction;
	}
	onFinished(content) {
		let startingSize = this.startingSize;
		content.height = startingSize.h;
		content.width = startingSize.w;
	}
}

let expandingButton = new Content(null, {
	active: true, height: 40, width: 100,
	top: 20, left: 20, 
	string:  "Acknowledge",
	skin: new Skin({ fill: color2 }),
	style: sampleStyle,
	Behavior: ExpandingBehavior
});


class SampleBehavior extends Behavior {
	onFinished(content) {
		content.state = 0;
	}
	onCreate(content) {
		trace(`onCreate(): Connected to Wi-Fi access point: ${Net.get("SSID")}\n`);
		trace(`onCreate(): content.name=${content.name}\n`)
	}
	onTimeChanged(content) {
		content.state = 1 - Math.quadEaseOut(content.fraction);
	}
	onDisplaying(content) {
		trace(`onDisplaying(): content.name=${content.name}\n`)
	}
	// onTouchBegan(content, id, x, y, ticks) {
	// 	trace(`onTouchBegan(): content.name=${content.name}, id=${id}, x=${x}, y=${y}\n`)
	// 	let anchor = this.anchor = content.position;
	// 	anchor.x -= x;
	// 	anchor.y -= y;
	// 	content.state = 1;
	// }
	// onTouchMoved(content, id, x, y, ticks) {
	// 	trace("onTouchMoved\n")
	// 	let anchor = this.anchor;
	// 	content.position = { x:anchor.x + x, y:anchor.y + y };
	// }
	onTouchEnded(content) {
		trace("touch ended\n")
		// content.duration = 250;
		// content.time = 0;
		// content.start();
	}
	// onDraw(port) {
	// 	let string = "Hello, World!";
	// 	let size = sampleStyle.measure(string);
	// 	port.drawLabel(string, port.width-size.width, port.height-size.height, size.width, size.height);
	// }
}

let requestLabel = new Label(null, {
	active: true,
	top: 0, height: 40, left: 0, right: 0,
	string:  "Nothing, for now",
	Behavior: SampleBehavior
})

const defaultCallbacks = {
	onHeader: function(value, value2) {
	}
}

server.callback = function(type, value, value2)
{
	// Disconnected. The request disconnected before the complete response could be delivered. Once disconnected, the request is closed by the server.
	if (type === Server.error) {
		trace(`server error: ${value}\n`)
	}
	// New connection received. A new requested has been accepted by the server.
	else if (type === Server.connection) {
		trace(`new connection\n`)
		this.ignore = false
	}
	// Status line of request received. The val1 argument contains the request path (e.g. index.html) and val2 contains the request method (e.g. GET).
	else if (type === Server.status) {
		trace(`request path=${value}, request method=${value2}\n`)
		// trace(`URL(${value})=${new URL(value)}\n`)
		// trace(`URL(${value}).searchParams=${new URL(value).searchParams}\n`)
		if (value === '/favicon.ico') {
			// ignore
			this.ignore = true
		}
		else if (value2 === 'GET' && value.startsWith('/task?set=')) {
			requestLabel.string = decodeURIComponent(value.substring(10))
		}
	}
	// One header received. A single HTTP header has been received, with the header name in lowercase letters in val1 (e.g. connection) and the header value (e.g. close) in val2.
	else if (type === Server.header) {
		!this.ignore && trace(`header ${value}=${value2}\n`)
	}
	// All headers received. All HTTP headers have been received. Return String or ArrayBuffer to receive the complete request body as an argument to the requestComplete message as the corresponding type; return true to have requestFragment invoked as the fragments arrrive. Return false or undefined to ignore the request body. The behavior for ohter return values is undefined.
	else if (type === Server.headersComplete) {
		!this.ignore && trace(`headers finished\n`)
		return ""
	}
	else if (type === Server.requestFragment) {
		!this.ignore && trace(`request fragment received\n`)
	}
	else if (type === Server.requestComplete) {
		!this.ignore && trace(`request completed - body=${value}\n`)
	}
	// Prepare response. The server is ready to send the response. Callback returns a dictionary with the response status (e.g. 200) in the status property, HTTP headers in an array on the headers property, and the response body on the body property. If the status property is missing, the default value of 200 is used. If the body is a String or ArrayBuffer, it is the complete response. The server adds the Content-Length HTTP header. If the body property is set to true, the response is delivered using the Transfer-encoding mode chunked, and the callback is invoked to retrieve each response fragment.
	else if (type === Server.prepareResponse) {
		!this.ignore && trace(`prepareResponse\n`)
		return {headers: ["Content-type", "text/plain"], body: `hello`};
	}
	// Get response fragment. The server is ready to transmit another fragment of the response. The val1 argument contains the number of bytes that may be transmitted. The callback returns either a String or ArrayBuffer. When all data of the request has been returned, the callback returns undefined.
	else if (type === Server.responseFragment) {
		!this.ignore && trace(`responseFragment - value=${value}, value2=${value2}\n`)
	}
	// Request complete. The request has successfully completed.
	else if (type === Server.responseComplete) {
		!this.ignore && trace(`responseComplete\n`)
	}


	// trace(`message=${message}\n`)
	// trace(`value=${value}\n`)

	// if (this.path != "/favicon.ico") {
	// 	requestLabel.string = this.path
	// }

	// if (Server.status === message)
	// 	this.path = value;

	// if (Server.prepareResponse === message)
	// 	return {headers: ["Content-type", "text/plain"], body: `hello, client at path ${this.path}.`};
}


let column1 = new Column(null, {
	top: 0, bottom: 0, left: 0, right: 0,
	skin: new Skin({ fill: color1 }), style: sampleStyle,
	contents: [
		requestLabel,
		Content(null, {
			active: true,
			top: 0, bottom: 0, left: 0, right: 0,
			skin: new Skin({ fill: color2 }),
			Behavior: ChangingBackgroundBehavior,
		})
	]
});

let BallApplication = Application.template($ => ({
	contents: [column1,
		expandingButton]
}));

export default new BallApplication(null, { displayListLength:4096, touchCount:1 });

	// let DragApplication = Application.template($ => ({
	// 	contents: [
	// 		Container($, {
	// 			left:18, right:18, top:18, bottom:18,
	// 			contents: [
	// 				Container($, {
	// 					left:2, right:2, top:2, bottom:2, clip:true,
	// 					contents: [
	// 						Label($, { left:10, top:10, width:120, height:40, string:"Drag 1", active:true, Behavior:DragBehavior })
	// 					],
	// 				}),
	// 			],
	// 		}),
	// 	]
	// }));
	
	// export default new DragApplication(null, { commandListLength:4096, displayListLength:4096, touchCount:1 });

// const itemSkin = new Skin({ fill:[ "#192eab", "black" ] });
// const itemStyle = new Style({ font:"20px Open Sans", color:"white", horizontal:"left" });
// const stripSkin = new Skin({ 
// 	texture: { path:"wifi-strip.png" }, 
// 	color: "white", 
// 	x: 0, y: 0, width: 28, height: 28, 
// 	states: 27, variants: 28 
// });


// class ListBehavior extends Behavior {
// 	countItems(port) {
// 		return this.data.length;
// 	}
// 	drawItem(port, index, x, y, width, height) {
// 		let item = this.data[index];

// 		port.skin = null;
// 		port.style = itemStyle;
// 		port.drawLabel(item.ssid, x + height, y, width - height, height, true);

// 		port.skin = stripSkin;
// 		port.variant = Math.abs(item.variant);
// 		port.state = (item.variant < 0) ? 0 : 1;
// 		port.drawContent(x, y, height, height);
// 	}
// 	invalidateItem(port, index) {
// 		let delta = this.delta;
// 		port.invalidate(port.x, delta * index, port.width, delta);
// 	}
// 	measureItem(port) {
// 		return 40;
// 	}
// 	onCreate(port, data) {
// 		this.data = data;
// 		this.delta = this.measureItem(port);
// 		this.hit = -1;
// 		this.state = 0;
// 		port.duration = 500;
// 	}
// 	onMeasureVertically(port, height) {
// 		return this.countItems(port) * this.delta;
// 	}
// 	onDraw(port, x, y, width, height) {
// 		port.state = 0;
// 		port.skin = itemSkin;
// 		port.drawContent(x, y, width, height);

// 		let delta = this.delta;
// 		let hit = this.hit;
// 		let index = Math.floor(y / delta);
// 		let limit = y + height;
// 		x = 0;
// 		y = index * delta;
// 		width = port.width;
// 		while (y < limit) {
// 			if (hit == index) {
// 				port.state = this.state;
// 				port.skin = itemSkin;
// 				port.drawContent(x, y, width, delta);
// 				port.state = 0;
// 			}

// 			this.drawItem(port, index, x, y, width, delta);
// 			index++;
// 			y += delta;
// 		}
// 	}
// 	onFinished(port) {
// 		this.hit = -1;
// 		port.stop();
// 	}
// 	onTimeChanged(port) {
// 		this.state = 1 - port.fraction;
// 		this.invalidateItem(port, this.hit);
// 	}
// 	onTouchBegan(port, id, x, y) {
// 		port.stop();
// 		let delta = this.delta;
// 		let index = Math.floor((y - port.y) / delta);
// 		this.hit = index;
// 		this.state = 1;
// 		this.invalidateItem(port, index);
// 	}
// 	onTouchCancelled(port, id, x, y) {
// 		port.time = 0;
// 		port.start();
// 	}
// 	onTouchEnded(port, id, x, y) {
// 		let index = this.hit;
// 		this.tapItem(port, this.hit);
// 		port.time = 0;
// 		port.start();
// 	}
// 	tapItem(port, index) {
// 		trace("Tap " + index + "\n");
// 	}
// };


// let TestApplication = Application.template($ => ({
// 	contents: [
// 			Port($, {left:0, right:0, top:0, active:true, Behavior:ListBehavior })
// 	]
// }));


// let TestApplication = Application.template($ => ({
// 	contents: [
// 		Scroller($, { 
// 			left:0, right:0, top:0, bottom:0, active:true, backgroundTouch:true, Behavior:ScrollerBehavior,
// 			contents: [
// 				Port($, {left:0, right:0, top:0, active:true, Behavior:ListBehavior }),
// 			]
// 		}),
// 	]
// }));

// let data = "This. is. a. test.".split(".").map((item, index) => ({ ssid:item.trim(), variant:(index % 10) - 5 }));

// export default new TestApplication(data, { displayListLength: 8192 });
