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

(function() {
	var panelTpl = CKEDITOR.addTemplate('infopanel', '<div style="display:none;" class="{cls}" role="presentation" id="{id}">{closeHtml}</div>'),
		panelCloseTpl = CKEDITOR.addTemplate('infopanelClose', '<a id="{id}_close" class="close_button" href="javascript:void(0)"' +
			' onclick="return CKEDITOR.tools.callFunction({fn}, this);" title="{title}" role="button"><span class="cke_label">X</span></a>');

	CKEDITOR.plugins.add('mindtouch/infopanel', {});

	CKEDITOR.ui.infoPanel = function(document, definition) {
		// Copy all definition properties to this object.
		if (definition) {
			CKEDITOR.tools.extend(this, definition);
		}

		// Set defaults.
		CKEDITOR.tools.extend(this, {
			hasClose: false
		});

		this.className = this.className || '';
		this.className += ' cke_infopanel';

		this.document = document;

		this._ = {
			groups: {},
			groupsList: []
		}
	};

	CKEDITOR.ui.infoPanel.prototype = {
		renderHtml: function(editor) {
			var output = [];
			this.render(editor, output);
			return output.join('');
		},

		render: function(editor, output) {
			var id = this._.id = CKEDITOR.tools.getNextId(),
				closeHtml = '';

			if (this.hasClose) {
				var closeFn = CKEDITOR.tools.addFunction(function() {
					this.hide();
				}, this);

				var params = {
					id: id,
					fn: closeFn,
					title: editor.lang.common.close
				};

				closeHtml = panelCloseTpl.output(params);
			}

			panelTpl.output({cls: this.className, id: id, closeHtml: closeHtml}, output);

			return this;
		},

		getContainer: function() {
			return this.document.getById(this._.id);
		},

		addGroup: function(name, priority) {
			priority = priority || 10;

			var doc = this.document,
				div = new CKEDITOR.dom.element('div', doc);

			div.addClass('cke_infopanel_group');
			div.setStyle('display', 'none');

			var group = {
				name: name,
				element: div,
				priority: priority,
				visible: false,
				labels: {}
			};

			this._.groups[name] = group;
			this._.groupsList.push(group);
			this._.groupsList.sort(function(groupA, groupB) {
				return groupA.priority < groupB.priority ? -1 : groupA.priority > groupB.priority ? 1 : 0;
			});

			for (var i = 0, count = this._.groupsList.length; i < count; i++) {
				if (this._.groupsList[i].name == name) {
					if (i == 0 && this._.groupsList.length == 1) {
						// only one group, append to container
						if (this.hasClose) {
							div.insertBefore(doc.getById(this._.id + '_close'));
						} else {
							this.getContainer().append(div);
						}
					} else if (i == 0) {
						// insert before the next group
						div.insertBefore(this._.groupsList[1].element);
					} else {
						// insert after the previous group
						div.insertAfter(this._.groupsList[i - 1].element);
					}

					break;
				}
			}

			return this;
		},

		showGroup: function(name) {
			if (this._.groups[name]) {
				this.show();
				this._.groups[name].element.setStyle('display', '');
				this._.groups[name].visible = true;

				this.updateGroupDelimiters();
			}

			return this;
		},

		hideGroup: function(name) {
			if (this._.groups[name]) {
				this._.groups[name].element.setStyle('display', 'none');
				this._.groups[name].visible = false;

				this.updateGroupDelimiters();

				var hidePanel = true;

				for (var i in this._.groups) {
					if (this._.groups[i].visible) {
						hidePanel = false;
						break;
					}
				}

				hidePanel && this.hide();
			}

			return this;
		},

		addLabel: function(group, name, label) {
			if (!this._.groups[group]) {
				throw 'Group "' + group + '" does not exist.';
			}

			var span = new CKEDITOR.dom.element('span', this.document);

			this._.groups[group].element.append(span);
			this._.groups[group].labels[name] = span;

			if (label) {
				this.updateLabel(name, group, label);
			}

			return this;
		},

		getLabelElement: function(group, name) {
			if (!this._.groups[group]) {
				throw 'Group "' + group + '" does not exist.';
			}

			return this._.groups[group].labels[name] || null;
		},

		updateLabel: function(group, name, label) {
			this._.groups[group] && this._.groups[group].labels[name] && this._.groups[group].labels[name].setHtml(label);
		},

		show: function() {
			if (typeof this.onShow === 'function' && !this.getContainer().isVisible() && this.onShow.call(this)) {
				return this;
			}

			this.getContainer().setStyle('display', '');
			return this;
		},

		hide: function() {
			if (typeof this.onHide === 'function' && this.getContainer().isVisible() && this.onHide.call(this)) {
				return this;
			}

			this.getContainer().setStyle('display', 'none');
			return this;
		},

		isVisible: function() {
			return this.getContainer().getStyle('display') != 'none';
		},

		updateGroupDelimiters: function() {
			var lastGroupFound = false;
			for (var i = this._.groupsList.length - 1; i >= 0; i--) {
				var group = this._.groupsList[i];
				if (this._.groups[group.name].visible && !lastGroupFound) {
					group.element.setStyle('margin-right', '-1px');
				} else {
					group.element.setStyle('margin-right', '');
				}
			}
		}
	};
})();
