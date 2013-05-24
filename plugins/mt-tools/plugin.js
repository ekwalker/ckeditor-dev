/*
 * MindTouch
 * Copyright (c) 2006-2012 MindTouch Inc.
 * http://mindtouch.com
 *
 * This file and accompanying files are licensed under the
 * MindTouch Master Subscription Agreement (MSA).
 *
 * At any time, you shall not, directly or indirectly: (i) sublicense,
 * resell, rent, lease, distribute, market, commercialize or otherwise
 * transfer rights or usage to: (a) the Software, (b) any modified version
 * or derivative work of the Software created by you or for you, or (c)
 * MindTouch Open Source (which includes all non-supported versions of
 * MindTouch-developed software), for any purpose including timesharing or
 * service bureau purposes; (ii) remove or alter any copyright, trademark
 * or proprietary notice in the Software; (iii) transfer, use or export the
 * Software in violation of any applicable laws or regulations of any
 * government or governmental agency; (iv) use or run on any of your
 * hardware, or have deployed for use, any production version of MindTouch
 * Open Source; (v) use any of the Support Services, Error corrections,
 * Updates or Upgrades, for the MindTouch Open Source software or for any
 * Server for which Support Services are not then purchased as provided
 * hereunder; or (vi) reverse engineer, decompile or modify any encrypted
 * or encoded portion of the Software.
 *
 * A complete copy of the MSA is available at http://www.mindtouch.com/msa
 */

CKEDITOR.plugins.add('mt-tools', {
	onLoad: function() {
		CKEDITOR.tools.extend(CKEDITOR.tools, {
			normalizeCssValue: function(el, property, attr) {
				var value = '';
				attr = attr || property;

				switch (property) {
					case 'background-image':
						value = el.getStyle(property).replace(/url\('?([^']*)'?\)/gi, '$1');
						break;
					case 'background-color':
					case 'border-color':
						if (el.getStyle(property).length > 0) {
							value = this.convertRgbToHex(el.getStyle(property));
						} else if (property == 'background-color' && el.hasAttribute('bgColor')) {
							value = el.getAttribute('bgColor');
						} else if (property == 'border-color' && el.hasAttribute('borderColor')) {
							value = el.getAttribute('borderColor');
						}
						break;
					case 'border-style':
						value = el.getStyle('border-style');

						if (value && value.match(/([^\s]*)\s/)) value = RegExp.$1;

						break;
					case 'border-width':
						value = parseInt(el.getStyle('border-width'), 10);
						value = isNaN(value) ? '' : value;
						break;
					case 'white-space':
						if (el.getStyle('white-space').length) {
							value = el.getStyle('white-space');
						} else {
							if (el.hasAttribute('noWrap')) value = 'nowrap';
						}
						break;
					default:
						if (el.hasAttribute(attr)) {
							value = el.getAttribute(attr);
						} else {
							value = el.getStyle(property);
						}
						break;
				}

				return value;
			},

			convertHexToRgb: function(color) {
				if (color.indexOf('#') == 0) {
					color = color.replace(/[^0-9A-F]/gi, '');

					r = parseInt(color.substring(0, 2), 16);
					g = parseInt(color.substring(2, 4), 16);
					b = parseInt(color.substring(4, 6), 16);

					color = "rgb(" + r + "," + g + "," + b + ")";
				} else {
					color = '';
				}

				return color;
			}
		});
	}
});
