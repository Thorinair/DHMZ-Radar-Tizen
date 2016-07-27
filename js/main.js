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
		sx: 483,
		sy: 140,
		sw: 86,
		sh: 26,
		dx: 137,
		dy: 330,
		dw: 86,
		dh: 26,
	};

var sources = [
		{src: "http://vrijeme.hr/bradar.gif"},
		{src: "http://vrijeme.hr/oradar.gif"}
	];

var loaded = false;
var rec = false;
var source = 0;

/*
 * Resets radar values to default.
 */
function resetRadar() {
	img = {
			sx: 1,
			sy: 1,
			sw: 478,
			sh: 478,
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
	if (img.sx < 1) {
		img.sx = 1;
	}
	else if (img.sx + img.sw > 478) {
		img.sx = 478 - img.sw;
	}
	
	if (img.sy < 1) {
		img.sy = 1;
	}
	else if (img.sy + img.sh > 478) {
		img.sy = 478 - img.sh;
	}
}

/*
 * Clears the canvas and draws the image.
 */
function drawImage() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    
	context.drawImage(imageObj, img.sx, img.sy, img.sw, img.sh, img.dx, img.dy, img.dw, img.dh);
	context.beginPath();
	context.moveTo(135, 328);
	context.lineTo(225, 328);
	context.lineTo(235, 360);
	context.lineTo(125, 360);
	context.fillStyle = "#000000";
	context.closePath();
	context.fill();
	context.drawImage(imageObj, tim.sx, tim.sy, tim.sw, tim.sh, tim.dx, tim.dy, tim.dw, tim.dh);
}

/*
 * Reloads the radar image from web.
 */
function drawRadar() {
	
    imageObj = new Image();

    imageObj.onload = function() {
    		// draw cropped image   
	    	pixelBlur();
	    	drawImage();
    		spinner.stop(target);
    		loaded = true;
    		rec = false;
    	};

    if (!rec) {
	    context.save();
		context.rect(0, 0, canvas.width, canvas.height);
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

/*
 * Fired when application loads.
 */
window.onload = function() {
    'use strict';

    canvas = document.querySelector('canvas');
    context = canvas.getContext('2d');
    
    target = document.getElementById('main');
    spinner = new Spinner(opts);
    
    resetRadar();
    drawRadar();
};

/*
 * Fired when user taps.
 */
window.onclick = function() {
	if (loaded) {
		drawRadar();
	}
};

/*
 * Registers all event handlers.
 */
(function(tau) {
    'use strict';
    document.addEventListener("pagebeforeshow", function() {
    	tau.event.enableGesture(document, new tau.event.gesture.Drag({}));

    	document.addEventListener("touchstart", function() {
	    		dragLastX = 0;
	    		dragLastY = 0;
    	});
        
        document.addEventListener("drag", function(e) {
        	
        	if (img.sw < 478) {
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
    
    document.addEventListener("visibilitychange", function() {
        if (!document.hidden) {
    		if (loaded) {
    			drawRadar();
    		}
        }
    });
    
    document.addEventListener("tizenhwkey", function(e) {
		if (e.keyName == "back") {
			if (loaded) {
				if (img.sw < 478) {
		    		resetRadar();
			    	pixelBlur();
			    	drawImage();
				}
				else {
					source += 1;
					if (source >= sources.length) {
						source = 0;
					}
					drawRadar();
				}
			}
			else {
				source += 1;
				if (source >= sources.length) {
					source = 0;
				}
	    		resetRadar();
		    	pixelBlur();
				drawRadar();
			}
		}
	});
    
    document.addEventListener( 'rotarydetent', function(e) {
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
		    	if (img.sw >= 478) {
			    	img.sw = 478;
			    	img.sh = 478;
			    	img.sx = 1;
			    	img.sy = 1;
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

