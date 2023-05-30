# Canvas Image Fit

An extension to HTML Canvas element, specifacally it's 2D rendering context, that adds a function to fit any image in between any specified 4 points.

## Demo

The demo is available on [github pages](https://frierr.github.io/canvas-image-fit/).

## How to use

Donwload the [canvas.js](https://github.com/frierr/canvas-image-fit/blob/master/canvas-fit.js) file and reference it in your project:

```html
<script src="./canvas-fit.js"></script>
```

Or link the file from github pages.

```html
<script src="https://frierr.github.io/canvas-image-fit/canvas-fit.js"></script>
```

In your javascript code call the function from your context:

```javascript
context.fitImage(image, x1, y1, x2, y2, x3, y3, x4, y4);
```

where (x, y) - are the coordinates on the canvas of the points where you want to fit the image.

## GPU processing

The process of fitting larger images is quite slow. You can speed it up a bit by using GPU processing, provided by the [gpu.js](https://github.com/gpujs/gpu.js/) library. 
