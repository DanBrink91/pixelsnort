var old_pixelSequence = [];
var imageData;
document.body.addEventListener("dragover", function(e){
  e.preventDefault();
}, false);

document.body.addEventListener("drop", function(e){
  var files = e.dataTransfer.files;
  if(files.length > 0) {
    var file = files[0];
    if(file.type.indexOf("image") != -1) {
      var reader = new FileReader();

      reader.onload = function(e) {
        im.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  e.preventDefault();
}, false);
function Pixel (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}
Pixel.prototype.toString = function() {
  return "#" + ("0" + this.r.toString(16)).slice(-2) + ("0" + this.g.toString(16)).slice(-2) + ("0" + this.b.toString(16)).slice(-2);
}

// array of rgba -> array of object (rgba)
function obj_list(flat_array) {
  var new_obj = [];
  var len = flat_array.length;
  for(var i = 0; i < len; i += 4) {
    new_obj.push(new Pixel(
        flat_array[i],
        flat_array[i + 1],
        flat_array[i + 2],
        flat_array[i + 3]
      ));
  }

  return new_obj
}
// array of object (rgba) -> array of rgba
function unwrap(data) {
  var unwrapped_list = [];
  var len = data.length;
  unwrapped_list.push(255);
  unwrapped_list.push(0);
  unwrapped_list.push(0);
  unwrapped_list.push(255);
  for(var i = 1; i < len; i++) {
    unwrapped_list.push(data[i].r);
    unwrapped_list.push(data[i].g);
    unwrapped_list.push(data[i].b);
    unwrapped_list.push(data[i].a);
  }

  return unwrapped_list;
}
function imageLoaded(ev) {
  // read the width and height of the canvas
  element.width = this.width;
  element.height = this.height;
  var width = this.width;
  var height = this.height;

  // stamp the image on the left of the canvas:
  c.drawImage(im, 0, 0);

  // get all canvas pixel data
  imageData = c.getImageData(0, 0, width, height);
  
  old_pixelSequence = obj_list(imageData.data)
  changeIt();
}

function changeIt() {
  var common_colors = find_common_colors(old_pixelSequence, colors_to_find);
  var new_pixelSequence = replaceWithMostCommon(old_pixelSequence, common_colors);
  var unwrapped = unwrap(new_pixelSequence);
  imageData.data.set(unwrapped);
  c.putImageData(imageData, 0, 0);
  closest_cache = {};
}
function find_common_colors(old_pixelSequence, color_count) {
  var colors = {};
  // Find X most common colors
  var len = old_pixelSequence.length;
  for(var i = 0; i < len; i++)
  {
    var value = old_pixelSequence[i].toString();
    if(value in colors) {
      colors[value].count++;
    }
    else {
      colors[value] = {}
      colors[value].count = 1;
      colors[value].color = old_pixelSequence[i];
    }
  }
  var color_values = Object.keys(colors).map(function(k){return colors[k];})
  var getMostCommon = new mostCommon(color_count);
  for(var i = 0, color_len = color_values.length; i < color_len; i++) {
    getMostCommon.push(color_values[i]);
  }
  var most_common_colors = getMostCommon.getColors();
  // Draw the most common colors in the canvas, grid style
  color_canvas.width = color_count * 20  > window.innerWidth ? Math.floor((window.innerWidth - 20)/20.0)*20: color_count*20 ;
  color_canvas.height = Math.ceil(most_common_colors.length/color_canvas.width*20) * 20;
  for(var i = 0; i < most_common_colors.length; i++){
    color_ctx.fillStyle =  most_common_colors[i].toString();
    var x = (i*20) % color_canvas.width;
    var y = Math.floor(i/color_canvas.width*20)*20;
    color_ctx.fillRect(x, y, 20, 20);
    color_ctx.strokeRect(x, y, 20, 20);
  }
  return most_common_colors;
}

var closest_cache = {};
function findClosest(pixel, common) {
  if(pixel in closest_cache) {
    return closest_cache[pixel];
  }
  var smallest = 100000;
  var smallest_index = 0;
  for(var i = 0, len = common.length; i<len; i++){
    var p1 = common[i];
    var dist_y = Math.pow(((p1.r - pixel.r) * .299), 2) + Math.pow(((p1.g - pixel.g) * .587),2) + Math.pow(((p1.b - pixel.b) * .114),2);
    if(dist_y <= smallest){
      smallest = dist_y;
      smallest_index = i;
    }
  }
  closest_cache[pixel] = common[smallest_index];
  return common[smallest_index];
}
function replaceWithMostCommon(list, common) {
  var len = list.length;
  var new_list = new Array(len);
  for(var i = 0; i < len; i++) {
    new_list[i] = findClosest(list[i], common);
  }
  return new_list;
}

// keeps keepCount-numbered elements, dropping the smallest when overflowing
function mostCommon(keepCount) {
  this.capacity = keepCount;
  this.colors = [];
  this.amountUsed = 0;
  this.smallest = 0;
}

mostCommon.prototype.push = function(obj) {
  // we're not full just add it
  if(this.amountUsed < this.capacity) {
    this.colors.push(obj);
    this.amountUsed++;
    this.colors.sort(function(c1, c2) {
      return c2.count - c1.count;
    });
    this.smallest = this.colors[this.amountUsed-1].count;
  }
  // if its smaller then our smallest add it and resort
  else if(obj.count < this.smallest) {
    this.colors[this.capacity-1] = obj;
    
    this.colors.sort(function(c1, c2) {
      return c2.count - c1.count;
    });
    this.smallest = this.colors[this.capacity-1].count;
  }
}
mostCommon.prototype.getColors = function(){
  return this.colors.map(function(m){ return m.color; });
}

var colors_to_find = 20;
var element = document.getElementById("myCanvas");
var c = element.getContext("2d");

var color_canvas = document.getElementById("colorCanvas");
var color_ctx = color_canvas.getContext('2d');
var colorsElement = document.getElementById("colorsToFind");

document.getElementById("findColorsButton").onclick = function(e) {
  colors_to_find = colorsElement.value;
  changeIt();
};
im = new Image();
im.onload = imageLoaded;
im.src = "bees.jpg";