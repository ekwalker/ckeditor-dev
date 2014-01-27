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

CKEDITOR.plugins.add('mindtouch/storage', {});

CKEDITOR.storage = CKEDITOR.tools.createClass({
	$: function() {
		this.storage = null;
		this.params = {};

		this.setKey();
		this.initStorage();
	},

	proto: {
		initStorage: function() {
			if (window.localStorage) {
				try {
					window.localStorage.setItem('cke_test', 'test');

					if (window.localStorage.getItem('cke_test') === 'test') {
						window.localStorage.removeItem('cke_test');
						this.storage = window.localStorage;
					}
				} catch (ex) {}
			}
		},

		isSupported: function() {
			return !!this.storage;
		},

		setKey: function(key) {
			key = key ? 'cke_' + key : 'cke';
			this.key = key;
		},

		setData: function(data) {
			if (this.storage) {
				try {
					this.storage.setItem(this.key, data);
					return true;
				} catch (ex) {}
			}

			return false;
		},

		setParam: function(name, value) {
			if (this.storage) {
				try {
					this.storage.setItem(this.key + '_' + name, value);
					this.params[name] = value;
					return true;
				} catch (ex) {}
			}

			return false;
		},

		getParam: function(name) {
			var param = this.params[name] || null;

			if (this.storage && !param) {
				param = this.storage.getItem(this.key + '_' + name);

				if (param) {
					this.params[name] = param;
				}
			}

			return param;
		},

		getData: function() {
			var data = this.storage && this.storage.getItem(this.key);
			return data;
		},

		isExists: function() {
			if (this.storage) {
				return !!this.storage.getItem(this.key);
			}

			return false;
		},

		remove: function() {
			if (this.storage) {
				this.storage.removeItem(this.key);

				// remove all params
				for (var i in this.params) {
					this.storage.removeItem(this.key + '_' + i);
				}

				this.params = {};

				return true;
			}

			return false;
		}
	}
});