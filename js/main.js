/*global window, document, tau, Spinner */

var canvas;
var context;
var target;
var spinner;
var img;
var imageObj;
var dragLastX;
var dragLastY;

var opts = {
		lines: 13, // The number of lines to draw
		length: 28, // The length of each line
		width: 14, // The line thickness
		radius: 42, // The radius of the inner circle
		scale: 0.25, // Scales overall size of the spinner
		corners: 1, // Corner roundness (0..1)
		color: '#ffffff', // #rgb or #rrggbb or array of colors
		opacity: 0.25, // Opacity of the lines
		rotate: 0, // The rotation offset
		direction: 1, // 1: clockwise, -1: counterclockwise
		speed: 1, // Rounds per second
		trail: 60, // Afterglow percentage
		fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
		zIndex: 2e9, // The z-index (defaults to 2000000000)
		className: 'spinner', // The CSS class to assign to the spinner
		top: '50%', // Top position relative to parent
		left: '50%', // Left position relative to parent
		shadow: false, // Whether to render a shadow
		hwaccel: false, // Whether to use hardware acceleration
		position: 'absolute' // Element positioning
	};

var tim = {
		sy: 64,
		sw: 80,
		sh: 15,
		dx: 182,
		dy: 8,
		dm: 2,
	};

var sources = [
        {src: "https://vrijeme.hr/goli-stat.png",     offset: 171},
       	{src: "https://vrijeme.hr/debeljak-stat.png", offset: 206},
		{src: "https://vrijeme.hr/bilogora-stat.png", offset: 202},
		{src: "https://vrijeme.hr/gradiste-stat.png", offset: 202}
	];

var loaded = false;
var rec = false;
var source = 2;

var imgNext = new Image();
var imgPrev = new Image();
var imgRefr = new Image();
var imgBG   = new Image();
var touched = -1;

var radarX = 1;
var radarY = 61;
var radarW = 658;
var radarH = 658

/*
 * Resets radar values to default.
 */
function resetRadar() {
	img = {
			sx: radarX,
			sy: radarY,
			sw: radarW,
			sh: radarH,
			dx: 0,
			dy: 0,
			dw: 360,
			dh: 360
		};
}

/*
 * Disables pixel blur on larger zooms.
 */
function pixelBlur() {
	if (img.sw < 240) {
	    context.webkitImageSmoothingEnabled = false;
	    context.mozImageSmoothingEnabled = false;
	    context.imageSmoothingEnabled = false; /// future
	}
	else {
	    context.webkitImageSmoothingEnabled = true;
	    context.mozImageSmoothingEnabled = true;
	    context.imageSmoothingEnabled = true; /// future
	}
}

/*
 * Prevents out of bounds image.
 */
function normalizePos() {
	if (img.sx < radarX) {
		img.sx = radarX;
	}
	else if (img.sx + img.sw > radarW) {
		img.sx = radarW - img.sw;
	}
	
	if (img.sy < radarY) {
		img.sy = radarY;
	}
	else if (img.sy + img.sh > radarH) {
		img.sy = radarH - img.sh;
	}
}

/*
 * Clears the canvas and draws the image.
 */
function drawImage() {
	// Clear
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Find Time Width
	context.drawImage(imageObj, sources[source].offset, tim.sy, tim.sw, tim.sh, 0, 0, tim.sw, tim.sh);
	var imgData = context.getImageData(0, 0, tim.sw, tim.sh);
	var data = imgData.data;
	var width = -1;
	for(var i = (data.length-1) - tim.sw * 4; i < data.length; i += 4) {
		if (data[i] != 255 || data[i + 1] != 255 || data[i + 2] != 255)
			break;
		else
	    	width++;
	}
    
    // Radar
	context.drawImage(imageObj, img.sx, img.sy, img.sw, img.sh, img.dx, img.dy, img.dw, img.dh);
	
	// Ellipse
	context.fillStyle = "#000000";	
	context.beginPath();	
	context.ellipse(180, 4, 84, 74, 0, 0, 2*Math.PI);
	context.fill();
	
	var cx = Math.round(tim.dx-((width*tim.dm)/2));
	
	// Time
	context.drawImage(imageObj, sources[source].offset, tim.sy, width, tim.sh, cx, tim.dy, width*tim.dm, tim.sh*tim.dm); //width*tim.dm
	
	// Increase contrast of time
	context.globalCompositeOperation="multiply";
	context.drawImage(imageObj, sources[source].offset, tim.sy, width, tim.sh, cx, tim.dy, width*tim.dm, tim.sh*tim.dm);
	context.drawImage(imageObj, sources[source].offset, tim.sy, width, tim.sh, cx, tim.dy, width*tim.dm, tim.sh*tim.dm);
	context.drawImage(imageObj, sources[source].offset, tim.sy, width, tim.sh, cx, tim.dy, width*tim.dm, tim.sh*tim.dm);
	context.drawImage(imageObj, sources[source].offset, tim.sy, width, tim.sh, cx, tim.dy, width*tim.dm, tim.sh*tim.dm);

	// Invert colors
	context.globalCompositeOperation="difference";
	context.fillStyle="#ffffff";
	context.fillRect(cx, tim.dy, width*tim.dm, tim.sh*tim.dm);

	// Colored line correction
	imgData = context.getImageData(135, 8, 90, 1);
	var data = imgData.data;
	for(var i = 0; i < data.length; i += 4) {
		if (data[i] >= 83 && data[i] <= 103 && data[i + 1] >= 65 && data[i + 1] <= 85 && data[i + 2] >= 93 && data[i + 2] <= 113) {
			data[i] = 0;
			data[i + 1] = 0;
			data[i + 2] = 0;
		}
	}
	context.putImageData(imgData, 135, 8);
	
	// Icon: Prev
	context.globalCompositeOperation="source-over";
	if (source > 0) {
		if (touched == 0)
			context.globalAlpha = 0.7;
		else
			context.globalAlpha = 1.0;		
	}
	else {
		context.globalAlpha = 0.2;
	}
	context.drawImage(imgPrev, 0, 0, 256, 512, 116, 14, 30, 60);
	// Icon: Next
	if (source < sources.length - 1) {
		if (touched == 2)
			context.globalAlpha = 0.7;
		else
			context.globalAlpha = 1.0;	
	}
	else {
		context.globalAlpha = 0.2;
	}
	context.drawImage(imgNext, 0, 0, 256, 512, 224, 14, 30, 60);
	// Icon: Refresh
	if (touched == 1)
		context.globalAlpha = 0.7;
	else
		context.globalAlpha = 1.0;	
	context.drawImage(imgRefr, 0, 0, 512, 512, 164, 38, 48, 48);
	context.globalAlpha = 1.0;	
}

/*
 * Reloads the radar image from web.
 */
function drawRadar() {
	
    imageObj = new Image();

    imageObj.onload = function() {
	    	pixelBlur();
	    	drawImage();
    		spinner.stop(target);
    		loaded = true;
    		rec = false;
    	};

    if (!rec) {
	    context.save();
		context.rect(0, 0, canvas.width, canvas.height);
		context.fillStyle = "#000000";
		context.globalAlpha = 0.5;
		context.fill();
		context.restore();
		rec = true;
    }
	spinner.spin(target);
        
	if(window.stop !== undefined) {
		window.stop();
	}
	else if(document.execCommand !== undefined) {
	 	document.execCommand("Stop", false);
	}
	loaded = false;
    imageObj.src = sources[source].src + "?" + new Date().getTime();
}

function exitApp() {
	try {
		tizen.application.getCurrentApplication().exit();
	} 
	catch (ignore) {
	}
}

/*
 * Fired when application loads.
 */
window.onload = function() {
    'use strict';    
    imgNext.src = "./img/angle-right-solid.svg";
    imgPrev.src = "./img/angle-left-solid.svg";
    imgRefr.src = "./img/sync-alt-solid.svg";
    imgBG.src   = "./img/bg.png";

    canvas = document.querySelector('canvas');
    context = canvas.getContext('2d');
    
    target = document.getElementById('main');
    spinner = new Spinner(opts);
    
    imgBG.onload = function() {
    	context.globalAlpha = 0.5;
    	context.drawImage(imgBG, 0, 0, 360, 360, 0, 0, canvas.width, canvas.height);
    	context.globalAlpha = 1.0;
        
        resetRadar();
        drawRadar();
	};
};

/*
 * Registers all event handlers.
 */
(function(tau) {
    'use strict';
    document.addEventListener("pagebeforeshow", function() {
    	tau.event.enableGesture(document, new tau.event.gesture.Drag({}));

    	document.addEventListener("touchstart", function(e) {
    		var x = e.changedTouches.item(0).screenX;
    		var y = e.changedTouches.item(0).screenY;
    		dragLastX = 0;
    		dragLastY = 0;

			if (loaded) {
				// Prev
	    		if (x > 96 && x < 150 && y < 64 && source > 0) {
	    			touched = 0;
			    	drawImage();
	    		}
	    		// Next
	    		else if (x > 210 && x < 264 && y < 64 && source < sources.length - 1) {
	    			touched = 2;
			    	drawImage();
	    		}
	    		// Refresh
	    		else if (x > 150 && x < 210 && y > 22 && y < 84) {
	    			touched = 1;
			    	drawImage();    			
	    		}
			}
    	});
    	
    	document.addEventListener("touchend", function(e) {
    		var x = e.changedTouches.item(0).screenX;
    		var y = e.changedTouches.item(0).screenY;

			if (loaded) {
	    		touched = -1;
				// Prev
	    		if (x > 96 && x < 150 && y < 64 && source > 0) {
	    			img.sw = radarW;
			    	img.sh = radarH;
			    	img.sx = radarX;
			    	img.sy = radarY;
			    	
					source--;
		    		resetRadar();
			    	pixelBlur();
					drawRadar();
	    		}
	    		// Next
	    		else if (x > 210 && x < 264 && y < 64 && source < sources.length - 1) {
	    			img.sw = radarW;
			    	img.sh = radarH;
			    	img.sx = radarX;
			    	img.sy = radarY;
			    	
					source++;
		    		resetRadar();
			    	pixelBlur();
					drawRadar();
	    		}
	    		// Refresh
	    		else if (x > 150 && x < 210 && y > 22 && y < 84) {
			    	pixelBlur();
	    			drawRadar();	    			
	    		}
	    		else {
			    	drawImage();
	    		}
			}
    	});
        
        document.addEventListener("drag", function(e) {
        	if (img.sw < radarW) {
	    		var dragX = e.detail.deltaX * (img.sw / 360);
	    		var dragY = e.detail.deltaY * (img.sh / 360);
	    		img.sx -= dragX - dragLastX;
	    		img.sy -= dragY - dragLastY;
	    		dragLastX = dragX;
	    		dragLastY = dragY;
	        	
	    		normalizePos();
		    	drawImage();
        	}
    	});
    });
    
    /*
    document.addEventListener("visibilitychange", function() {
        if (!document.hidden) {
    		if (loaded) {
    			drawRadar();
    		}
        }
    });
    */
    
    document.addEventListener("tizenhwkey", function(e) {
		if (e.keyName == "back") {			
			if (loaded) {
				if (img.sw < radarW) {
		    		resetRadar();
			    	pixelBlur();
			    	drawImage();
				}
				else {
					exitApp();
				}
			}
			else {
				exitApp();
			}
		}
	});
    
    document.addEventListener("rotarydetent", function(e) {
		if (loaded) {
			var ox, oy;
	    	/* Get the direction value from the event */
		    if (e.detail.direction == "CW") {
		    	ox = img.sx + img.sw/2;
		    	oy = img.sy + img.sh/2;
		    	img.sw = img.sw * (3/4);
		    	img.sh = img.sh * (3/4);
		    	if (img.sw < 32) {
			    	img.sw = 32;
			    	img.sh = 32;
		    	}
		    	img.sx = ox - img.sw/2;
		    	img.sy = oy - img.sh/2;
	    		normalizePos();
		    	pixelBlur();
		    	drawImage();
		    }
		    else if (e.detail.direction == "CCW") {
		    	ox = img.sx + img.sw/2;
		    	oy = img.sy + img.sh/2;
		    	img.sw = img.sw / (3/4);
		    	img.sh = img.sh / (3/4);
		    	if (img.sw >= radarW) {
			    	img.sw = radarW;
			    	img.sh = radarH;
			    	img.sx = radarX;
			    	img.sy = radarY;
		    	}
		    	else {
			    	img.sx = ox - img.sw/2;
			    	img.sy = oy - img.sh/2;
		    		normalizePos();
		    	}
		    	pixelBlur();
		    	drawImage();
		    }
		}
	});
}(tau));

