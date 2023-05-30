/*
Extends the default 2d canvas context with an image fit function
*/
CanvasRenderingContext2D.prototype.fitImage = function(image, ...points) {
    image = this.fitImageOptimiseImageScale(image, points);
    try {
        const gpu = new GPU();
        this.fitImageGPU(gpu, image, ...points);
    } catch(e) {
        console.log("gpu.js module is not connected. using cpu render instead.");
        this.fitImageCPU(image, ...points);
    }
}

/*
calculates image fit function on gpu
*/
CanvasRenderingContext2D.prototype.fitImageGPU = function(gpu, image, ...points) {
    const height = image.height;
    const width = image.width;

    /*
    Extracts colour data from an image
    */
    const cd = gpu.createKernel(function(image) {
        const pixel = image[this.thread.y][this.thread.x];
        this.color(pixel[0], pixel[1], pixel[2]);
    }).setOutput([width, height]).setGraphical(true);

    cd(image);
    const cdd = cd.getPixels();
    const colourdata = [];
    var counter = 0;
    for (var i = 0; i < height; i++) {
        colourdata[i] = [];
        for (var j = 0; j < width; j++) {
            colourdata[i][j] = [cdd[counter], cdd[counter + 1], cdd[counter + 2]];
            counter += 4;
        }
    }

    /*
    Gets pixel points projected on polygon
    */
    const getPixelsA = gpu.createKernel(function(points, w, h) {
        /*
        Gets point position on a line, depending on the segment length
        */
        function getPointOnLine(p1, p2, n, d) {
            const r = n / d;
            return [r * p2[0] + (1 - r) * p1[0], r * p2[1] + (1 - r) * p1[1]];
        }

        const px1 = getPointOnLine([points[0], points[1]], [points[2], points[3]], this.thread.y, w);
        const px2 = getPointOnLine([points[4], points[5]], [points[6], points[7]], this.thread.y, w);
        const py = getPointOnLine(px1, px2, this.thread.x, h);
        return [py[0], py[1]];
    }).setOutput([height, width]);
    const getPixelsB = gpu.createKernel(function(points, w, h) {
        function getPointOnLine(p1, p2, n, d) {
            const r = n / d;
            return [r * p2[0] + (1 - r) * p1[0], r * p2[1] + (1 - r) * p1[1]];
        }

        const px1 = getPointOnLine([points[0], points[1]], [points[2], points[3]], this.thread.y + 1, w);
        const px2 = getPointOnLine([points[4], points[5]], [points[6], points[7]], this.thread.y + 1, w);
        const py = getPointOnLine(px1, px2, this.thread.x, h);
        return [py[0], py[1]];
    }).setOutput([height, width]);
    const getPixelsC = gpu.createKernel(function(points, w, h) {
        function getPointOnLine(p1, p2, n, d) {
            const r = n / d;
            return [r * p2[0] + (1 - r) * p1[0], r * p2[1] + (1 - r) * p1[1]];
        }

        const px1 = getPointOnLine([points[0], points[1]], [points[2], points[3]], this.thread.y + 1, w);
        const px2 = getPointOnLine([points[4], points[5]], [points[6], points[7]], this.thread.y + 1, w);
        const py = getPointOnLine(px1, px2, this.thread.x + 1, h);
        return [py[0], py[1]];
    }).setOutput([height, width]);
    const getPixelsD = gpu.createKernel(function(points, w, h) {
        function getPointOnLine(p1, p2, n, d) {
            const r = n / d;
            return [r * p2[0] + (1 - r) * p1[0], r * p2[1] + (1 - r) * p1[1]];
        }

        const px1 = getPointOnLine([points[0], points[1]], [points[2], points[3]], this.thread.y, w);
        const px2 = getPointOnLine([points[4], points[5]], [points[6], points[7]], this.thread.y, w);
        const py = getPointOnLine(px1, px2, this.thread.x + 1, h);
        return [py[0], py[1]];
    }).setOutput([height, width]);

    const pixelsA = getPixelsA(points, width, height);
    const pixelsB = getPixelsB(points, width, height);
    const pixelsC = getPixelsC(points, width, height);
    const pixelsD = getPixelsD(points, width, height);

    /*
    Draws singular pixel of the image on polygon
    */
    function drawPixel(pixel, target, data) {
        target.fillStyle = `rgba(${data[0]},${data[1]},${data[2]},1)`;
        target.strokeStyle = target.fillStyle;
        target.beginPath();
        target.moveTo(pixel[0].x, pixel[0].y);
        target.lineTo(pixel[1].x, pixel[1].y);
        target.lineTo(pixel[2].x, pixel[2].y);
        target.lineTo(pixel[3].x, pixel[3].y);
        target.closePath();
        target.stroke();
        target.fill();
    };

    this.save();
    this.lineWidth = 1;
    //draw pixels
    for(var i = 0; i < width; i++) {
        for(var j = 0; j < height; j++) {
            drawPixel([
                {x: pixelsA[i][j][0], y: pixelsA[i][j][1]},
                {x: pixelsB[i][j][0], y: pixelsB[i][j][1]},
                {x: pixelsC[i][j][0], y: pixelsC[i][j][1]},
                {x: pixelsD[i][j][0], y: pixelsD[i][j][1]}
            ], this, colourdata[j][i]);
        }
    }
    this.restore();
}

/*
calculates image fit function on cpu
*/
CanvasRenderingContext2D.prototype.fitImageCPU = function(image, ...points) {
    /*
    Extracts colour data from an image
    */
    function getImageColourData(image) {
        //creates temporary canvas to get the data from
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        var data = [];
        //cycles through each pixel to extract its colour data
        for (var i = 0; i < image.width; i++) {
            data[i] = [];
            for (var j = 0; j < image.height; j++) {
                const tempdata = ctx.getImageData(i, j, 1, 1).data;
                data[i][j] = [tempdata[0], tempdata[1], tempdata[2]];
            }
        }
        canvas.remove();
        return data;
    };

    /*
    Gets point position on a line, depending on the segment length
    */
    function getPointOnLine(p1, p2, n, d) {
        const r = n / d;
        return {x: r * p2.x + (1 - r) * p1.x, y: r * p2.y + (1 - r) * p1.y};
    };

    /*
    Gets pixel points projected on polygon
    */
    function getPixel(polygon, i, j, w, h) {
        const px1 = getPointOnLine(polygon[0], polygon[1], i, w);
        const px2 = getPointOnLine(polygon[0], polygon[1], i + 1, w);
        const px4 = getPointOnLine(polygon[3], polygon[2], i, w);
        const px3 = getPointOnLine(polygon[3], polygon[2], i + 1, w);
        const py1 = getPointOnLine(px1, px4, j, h);
        const py4 = getPointOnLine(px1, px4, j + 1, h);
        const py2 = getPointOnLine(px2, px3, j, h);
        const py3 = getPointOnLine(px2, px3, j + 1, h);
        return [py1, py2, py3, py4];
    };

    /*
    Draws singular pixel of the image on polygon
    */
    function drawPixel(pixel, target, data) {
        target.fillStyle = `rgba(${data[0]},${data[1]},${data[2]},1)`;
        target.strokeStyle = target.fillStyle;
        target.beginPath();
        target.moveTo(pixel[0].x, pixel[0].y);
        target.lineTo(pixel[1].x, pixel[1].y);
        target.lineTo(pixel[2].x, pixel[2].y);
        target.lineTo(pixel[3].x, pixel[3].y);
        target.closePath();
        target.stroke();
        target.fill();
    };

    const width = image.width;
    const height = image.height;
    const colourdata = getImageColourData(image);
    //presents point collection as a polygon for ease of use
    const polygon = [
        {x: points[0],
        y: points[1]},
        {x: points[2],
        y: points[3]},
        {x: points[6],
        y: points[7]},
        {x: points[4],
        y: points[5]}
    ];
    this.save();
    this.lineWidth = 1;
    //draws each pixel of the image on the polygon
    for(var i = 0; i < width; i++) {
        for(var j = 0; j < height; j++) {
            drawPixel(getPixel(polygon, i, j, width, height), this, colourdata[i][j]);
        }
    }
    this.restore();
}

/*
Compares render area to image size and scales image down if necessary
*/
CanvasRenderingContext2D.prototype.fitImageOptimiseImageScale = function(image, points) {
    if (image.width > image.height) {
        //get approximate image render area size
        const max_x = Math.max(points[0], points[2], points[4], points[6]);
        const min_x = Math.min(points[0], points[2], points[4], points[6]);
        const w = max_x - min_x;
        //compare width
        if (image.width > w) {
            //rescale
            const h1 = image.height * (w / image.width);
            const canv = document.createElement("canvas");
            canv.width = w;
            canv.height = h1;
            const ctx = canv.getContext("2d");
            ctx.drawImage(image,0,0,w,h1);
            return canv;
        }
    } else {
        //get approximate image render area size
        const max_y = Math.max(points[1], points[3], points[5], points[7]);
        const min_y = Math.min(points[1], points[3], points[5], points[7]);
        const h = max_y - min_y;
        //compare height
        if (image.height > h) {
            //rescale
            const w1 = image.width * (h / image.height);
            const canv = document.createElement("canvas");
            canv.width = w1;
            canv.height = h;
            const ctx = canv.getContext("2d");
            ctx.drawImage(image,0,0,w1,h);
            return canv;
        }
    }
    return image;
}