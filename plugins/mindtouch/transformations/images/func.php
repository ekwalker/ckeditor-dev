<?php
// Checking for gd and Freetype support 
if (!function_exists('gd_info'))
{
	die('No <a href="http://php.net/manual/en/ref.image.php">gd</a> support in PHP.');
}

$gd = gd_info();
if ($gd["FreeType Support"] == false)
{
	die('No FreeType support in gd</a>');
}

// full path to preferred TTF font 
$font = '../font/PTS75F.ttf';

$func = isset($_GET['func']) ? $_GET['func'] : 'none';
$func = substr(trim($func), 0, 50);

// text and size
$text = 'Syntax highlighter: ' . $func;
$font_size = 10;

// getting bounding box 
$bbox = imagettfbbox($font_size, 0, $font, $text);

// fix for 0 -1 position values
// fixed height for lower case letters
// @link {http://youtrack.developer.mindtouch.com/issue/MT-9807#comment=46-15082}
$bbox[0] = $bbox[6] = -1;
$bbox[1] = $bbox[3] = 3;

// imagettfbbox returns very strange results 
// so transforming them to plain width and height 

// width: right corner X - left corner X
$size_w = abs($bbox[2] - $bbox[0]);

// height: top Y - bottom Y
$size_h = abs($bbox[7] - $bbox[1]);

// This is a lower-left corner 
// but imagettfbbox() sets (0,0) point
// inside bounding box
// so we shifting lower-left corner
$x = -abs($bbox[0]); 
$y = $size_h - abs($bbox[1]);

// creating image
$im = imagecreatetruecolor($size_w, $size_h);

$back = imagecolorallocatealpha($im, 255, 255, 255, 0); // background color
$fore = imagecolorallocate($im, 153, 153, 153); // foreground color

// filling with background color
imagefilledrectangle($im, 0, 0, $size_w - 1, $size_h - 1, $back);

// rendering text
imagettftext($im, $font_size, 0, $x, $y, $fore, $font, $text);

// outputing PNG image
header("Content-type: image/png");
imagepng($im);

// destroy image
imagedestroy($im);
