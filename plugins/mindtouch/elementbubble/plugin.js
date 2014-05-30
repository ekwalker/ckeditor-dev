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

CKEDITOR.plugins.add('mindtouch/elementbubble', {
	onLoad: function() {
		CKEDITOR.document.appendStyleText(
			'.cke_element_bubble {' +
			'	white-space: nowrap;' +
			'	font-size: 90%;' +
			'	position: absolute;' +
			'	padding: 10px;' +
			'	color: #666;' +
			'	background-color: #fff;' +
			'	background-image: none;' +
			'	border: 1px solid #d3d3d3;' +
			'	-moz-box-shadow: 0 1px 3px rgba(0, 0, 0, .2);' +
			'	-ms-box-shadow: 0 1px 3px rgba(0, 0, 0, .2);' +
			'	box-shadow: 0 1px 3px rgba(0, 0, 0, .2);' +
			'	z-index: 2;' +
			'	cursor: default;' +
			'}' +
			'.cke_element_bubble a { cursor: pointer; }');
	}
});

CKEDITOR.ui.elementBubble = CKEDITOR.tools.createClass({
	$: function(definition, doc, editor) {
		CKEDITOR.tools.extend(this, definition);

		this.doc = doc;
		this.editor = editor;

		this.bubble = this.doc.createElement('div');
		this.bubble.addClass('cke_element_bubble');
		this.bubble.data('cke-element-bubble', 1);
		this.bubble.hide();

		this.name && this.bubble.addClass('cke_element_bubble__' + this.name);

		this.bubble.unselectable();

		this.bubble.on('mousedown', function(evt) {
			var target = evt.data.getTarget();
			if (target && !target.is('a', 'select')) {
				evt.data.preventDefault();
			}
		});

		this.doc.getBody().append(this.bubble);

		var detach = CKEDITOR.tools.bind(function() { this.detach() }, this);
		editor.on('contentDom', detach);
		editor.on('contentDomUnload', detach);

		editor.on('destroy', function() {
			this.detach();
			this.bubble.remove();
		}, this);

		this.attachedElement = null;
	},

	_ : {
		update: function() {
			if (!this.isAttached()) {
				this.detach();
				return;
			}

			var pxUnit = CKEDITOR.tools.cssLength,
				element = this.getAttachedElement(),
				elementPosition;

			this.bubble.setHtml('');

			// allow to change element to calculate bubble's position
			var data = {
				element: element
			};

			this.onUpdate && this.onUpdate.call(this, data);

			element = data.element;

			try {
				elementPosition = element.getDocumentPosition(this.doc);
			} catch (e) {
				this._.asyncUpdate();
				return;
			}

			var width = element.$.offsetWidth,
				height = element.$.offsetHeight;

			// we can get zero width and height in Chrome in some cases
			if (width == 0 && height == 0) {
				return;
			}

			this.bubble.setStyles({
				top: pxUnit(elementPosition.y + height),
				visibility: 'hidden'
			});

			this.bubble.removeStyle('left');
			this.bubble.removeStyle('right');
			this.bubble.setStyle('display', '');

			var windowSize = this.doc.getWindow().getViewPaneSize();
			if ((elementPosition.x + this.bubble.$.offsetWidth) > windowSize.width) {
				this.bubble.setStyle('right', pxUnit(windowSize.width - elementPosition.x - width));
			} else {
				this.bubble.setStyle('left', pxUnit(elementPosition.x));
			}

			this.bubble.removeStyle('visibility');
		},
		asyncUpdate: function() {
			var self = this;
			window.setTimeout(function() {
				self._.update();
			}, 0);
		}
	},

	proto: {
		attach: function(element) {
			if (!element || (this.attachedElement && this.attachedElement.equals(element))) {
				return;
			} else if (this.attachedElement) {
				this.detach();
			}

			if (this.filter && this.filter.call(this, element)) {
				this.detach();
				return;
			}

			this.attachedElement = element;

			this.doc.getWindow().on('resize', this._.update, this);
			this.editor.on('change', this._.asyncUpdate, this);
			this.editor.on('infobar', this._.update, this);

			this.onAttach && this.onAttach.call(this);

			this._.asyncUpdate();
		},

		detach: function() {
			this.doc.getWindow().removeListener('resize', this._.update);
			this.editor.removeListener('change', this._.asyncUpdate);
			this.editor.removeListener('infobar', this._.update);

			this.onDetach && this.onDetach.call(this);

			this.attachedElement = null;
			this.bubble.hide();
		},

		getElement: function() {
			return this.bubble;
		},

		setElement: function(bubble) {
			this.bubble = bubble;
		},

		getAttachedElement: function() {
			return this.attachedElement;
		},

		isAttached: function() {
			return !!this.getAttachedElement();
		}
	}
});
