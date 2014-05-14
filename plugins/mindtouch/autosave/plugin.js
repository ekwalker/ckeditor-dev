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

/**
 * @file Autosave plugin.
 * @link {http://developer.mindtouch.com/User:dev/Specs/Autosave/Autosave_with_HTML5_Web_Storage:_editor_plugin}
 */

(function() {

	var continueTpl = CKEDITOR.addTemplate('autosaveContinue', '<a href="javascript:void(0)"' +
		' onclick="return CKEDITOR.tools.callFunction({fn}, event);">{label}</a>'),
		discardTpl = CKEDITOR.addTemplate('autosaveDiscard', '<a href="javascript:void(0)"' +
		' onclick="return CKEDITOR.tools.callFunction({fn}, event);">{label}</a>'),
		delimiterTpl = CKEDITOR.addTemplate('autosaveDelimiter', '<span class="delimiter">{label}</span>');

	// allow additional checks on dirty
	function checkDirty(editor) {
		return editor.fire('checkDirty', {
			isDirty: false
		}).isDirty;
	}

	CKEDITOR.plugins.add('mindtouch/autosave', {
		lang: 'en',  // %REMOVE_LINE_CORE%
		requires: 'mindtouch/infobar,mindtouch/infopanel,mindtouch/storage',
		beforeInit: function() {
			CKEDITOR.plugins.draft = CKEDITOR.tools.createClass({
				base: CKEDITOR.storage,

				$: function(editor) {
					this.editor = editor;

					this.base.call(this);

					if (this.editor.config.mindtouch.pageId > 0) {
						this.setKey(this.editor.config.mindtouch.pageId);
					} else {
						this.setKey(encodeURIComponent(this.editor.config.mindtouch.pageTitle));
					}

					this.addUnloadHandler();
				},

				proto: {
					addUnloadHandler: function() {
						if (this.isSupported() && jQuery) {
							var me = this;

							this.removeUnloadHandler();

							$(window).bind('beforeunload.editor', function() {
								if (checkDirty(me.editor)) {
									me.save();
								}
							});
						}
					},

					removeUnloadHandler: function() {
						if (this.isSupported() && jQuery) {
							$(window).unbind('beforeunload.editor');
						}
					},

					save: function() {
						var data = this.editor.getData(),
							result = this.setData(data);

						if (result) {
							this.setParam('timestamp', new Date().getTime());

							// async event is necessary for IE
							var me = this;
							window.setTimeout(function() {
								me.editor.fire('draftSaved');
							}, 0);

							return true;
						}

						return false;
					},

					getTimestamp: function() {
						var timestamp = this.getParam('timestamp');

						if (timestamp) {
							timestamp = parseInt(timestamp);
						}

						return timestamp;
					},

					load: function() {
						var data = this.getData();

						if (data) {
							this.editor.setData(data, function() {
								this.focus();

								var editor = this;
								setTimeout(function() {
									editor.selectionChange();
									editor.fire('draftLoaded');
								}, 200);
							});
							return true;
						}

						return false;
					}
				}
			});
		},

		init: function(editor) {
			if (editor.readOnly || editor.config.mindtouch.sectionId || editor.config.mindtouch.userIsAnonymous) {
				return;
			}

			var draft = new CKEDITOR.plugins.draft(editor);

			if (!draft.isSupported()) {
				return;
			}

			var lang = editor.lang[ 'mindtouch/autosave' ],
				prevSnapshot,
				autosaveInterval,
				updateLabelInterval;

			editor.on('draftLoaded', function() {
				prevSnapshot = editor.getSnapshot();
			});

			var infoPanel = new CKEDITOR.ui.infoPanel(CKEDITOR.document, {
				className: 'cke_autosavepanel',
				onHide: function() {
					editor.removeListener('focus', focusContinueLink);
					editor.window.removeListener('focus', focusContinueLink);

					if (window.jQuery) {
						jQuery(this.getContainer().$).fadeOut(200);
						return true;
					}

					return false;
				}
			});

			function focusContinueLink() {
				if (infoPanel && infoPanel.isVisible()) {
					setTimeout(function() {
						editor.focusManager.blur();
						infoPanel.getLabelElement('draft', 'links').getFirst().focus();
					}, 0);
				}
			};

			var autosave = function() {
				if (!editor.readOnly && checkDirty(editor)) {
					var snapshot = editor.getSnapshot();
					if (!prevSnapshot || (Math.abs(snapshot.length - prevSnapshot.length) > editor.config.autosave_minLength)) {
						if (draft.save()) {
							prevSnapshot = snapshot;
						}
					}
				}
			};

			var getFormattedTime = function(date) {
				var hrs = date.getHours(),
					mins = date.getMinutes(),
					postfix = '';

				if (editor.config.autosave_timeFormat == '24H') {
					hrs = (hrs < 10) ? '0' + hrs : hrs;
				} else {
					if (hrs > 11) {
						hrs = hrs - 12;
						postfix = ' PM';
					} else {
						postfix = ' AM';
					}

					if (hrs === 0) {
						hrs = 12;
					}
				}

				mins = (mins < 10) ? '0' + mins : mins;

				return hrs + ':' + mins + postfix;
			};

			var getFromattedDate = function(date) {
				var month = date.getMonth() + 1,
					day = date.getDate(),
					year = date.getFullYear();

				month = (month < 10) ? '0' + month : month;
				day = (day < 10) ? '0' + day : day;

				var formattedDate = editor.config.autosave_dateFormat.replace('%m', month)
					.replace('%d', day)
					.replace('%y', year);

				return formattedDate;
			};

			var timeAgo = function() {
				var diff = new Date().getTime() - draft.getTimestamp(),
					seconds = diff / 1000,
					minutes = seconds / 60,
					hours = minutes / 60,
					days = hours / 24,
					years = days / 365;

				var label = seconds < 45 && lang.timeago.seconds ||
					seconds < 90 && lang.timeago.minute ||
					minutes < 45 && lang.timeago.minutes.replace('%1', Math.round(minutes)) ||
					minutes < 90 && lang.timeago.hour ||
					hours < 24 && lang.timeago.hours.replace('%1', Math.round(hours)) ||
					hours < 48 && lang.timeago.day ||
					days < 30 && lang.timeago.days.replace('%1', Math.floor(days)) ||
					days < 60 && lang.timeago.month ||
					days < 365 && lang.timeago.months.replace('%1', Math.floor(days / 30)) ||
					years < 2 && lang.timeago.year ||
					lang.timeago.years.replace('%1', Math.floor(years));

				label += ' ' + lang.timeago.suffixAgo;

				return label;
			};

			var updateTimeAgo = function(initLabel) {
				editor.ui.infobar.updateLabel('autosave', 'timeAgo', initLabel);
				editor.ui.infobar.showGroup('autosave');

				updateLabelInterval && window.clearInterval(updateLabelInterval);
				updateLabelInterval = window.setInterval(function() {
					editor.ui.infobar.updateLabel('autosave', 'timeAgo', lang.localSave + ' (' + timeAgo() + ')');
				}, 15000);
			};

			var startAutosave = function() {
				autosave();
				autosaveInterval = window.setInterval(autosave, editor.config.autosave_interval * 1000);
				editor.on('saveSnapshot', autosave, null, null, 100);
			};

			var stopAutosave = function() {
				window.clearInterval(autosaveInterval);
				updateLabelInterval && window.clearInterval(updateLabelInterval);
			};

			var onExitEditor = function(evt) {
				stopAutosave();

				if (evt.data && evt.data.removeDraft === false) {
					try {
						draft.setParam('canceled', true);
					} catch (ex) {}
				} else {
					draft.remove();
				}

				draft.removeUnloadHandler();
			};

			editor.on('save', onExitEditor);
			editor.on('cancel', onExitEditor, null, null, 1);

			editor.on('destroy', function(evt) {
				stopAutosave();
			});

			var checkDraftAvailable = function() {
				if (!draft.isExists()) {
					startAutosave();
					return false;
				}

				editor.focusManager.blur(1);
				editor.lock && editor.lock();

				var currentData = editor.getData();

				editor.on('draftLoaded', function() {
					startAutosave();

					var continueFn, discardFn, onEsc;

					continueFn = function() {
						editor.removeListener('draftSaved', continueFn);
						editor.editable().removeListener('keydown', continueFn);
						editor.editable().removeListener('click', continueFn);
						CKEDITOR.document.removeListener('keydown', onEsc);
						infoPanel.hide();
						updateTimeAgo(lang.localSave + ' (' + timeAgo() + ')');
						editor.focus();
						return false;
					};

					discardFn = function() {
						editor.removeListener('draftSaved', continueFn);
						editor.editable().removeListener('keydown', continueFn);
						editor.editable().removeListener('click', continueFn);
						CKEDITOR.document.removeListener('keydown', onEsc);
						editor.setData(currentData, function() {
							editor.resetDirty();
							draft.remove();
							infoPanel.hide();
							editor.focus();
						});
						return false;
					};

					onEsc = function(evt) {
						if (evt.data.getKeystroke() == 27) {
							setTimeout(discardFn, 0);
						}
					};

					var continueFnRef = CKEDITOR.tools.addFunction(continueFn),
						discardFnRef = CKEDITOR.tools.addFunction(discardFn);

					editor.on('destroy', function(evt) {
						CKEDITOR.tools.removeFunction(continueFnRef);
						CKEDITOR.tools.removeFunction(discardFnRef);
					});


					var draftDate = new Date(draft.getTimestamp()),
						pageRevision = parseInt(editor.config.mindtouch.pageRevision),
						draftRevision = parseInt(draft.getParam('pageRevision')),
						continueLinkLabel = lang.continueEditing,
						discardLinkLabel = lang.discardChanges,
						linksDelimiter = '',
						notificationLabel;

					if (pageRevision > draftRevision) {
						// draft is outdated
						notificationLabel = lang.draftOutdated.replace('%1', draftRevision)
							.replace('%2', pageRevision);

						continueLinkLabel = lang.editVersion.replace('%1', draftRevision);
						discardLinkLabel = lang.editVersion.replace('%1', pageRevision);
						linksDelimiter = delimiterTpl.output({label: lang.or});

						infoPanel.getContainer().addClass('cke_autosave_outdated');
					} else {
						notificationLabel = lang.draftExists.replace('%1', getFromattedDate(draftDate))
							.replace('%2', getFormattedTime(draftDate));
					}

					var output = [];
					continueTpl.output({fn: continueFnRef, label: continueLinkLabel}, output);
					output.push(linksDelimiter);
					discardTpl.output({fn: discardFnRef, label: discardLinkLabel}, output);

					infoPanel.updateLabel('draft', 'notification', notificationLabel);
					infoPanel.updateLabel('draft', 'links', output.join(''));

					infoPanel.showGroup('draft');

					editor.on('draftSaved', continueFn);
					CKEDITOR.document.on('keydown', onEsc);
					editor.editable().on('keydown', continueFn);
					editor.editable().on('click', continueFn);

					editor.unlock && editor.unlock();

					editor.on('focus', focusContinueLink);
					editor.window.on('focus', focusContinueLink);

					focusContinueLink();
				});

				draft.load();
				return true;
			};

			editor.on('instanceReady', function() {
				setTimeout(checkDraftAvailable, 100);
			});

			editor.on('draftSaved', function() {
				draft.setParam('pageRevision', editor.config.mindtouch.pageRevision);
				updateTimeAgo(lang.localSave + ' (' + lang.timeago.justNow + ')');
			});

			editor.on( 'uiSpace', function(evt) {
				if (evt.data.space == 'top') {
					evt.removeListener();
					evt.data.html += infoPanel.renderHtml(evt.editor);
				}
			});

			editor.on('uiReady', function() {
				var infoBar = editor.ui.infobar;
				infoBar.addGroup('autosave', 1);
				infoBar.addLabel('autosave', 'timeAgo');

				infoPanel.addGroup('draft');
				infoPanel.addLabel('draft', 'notification');
				infoPanel.addLabel('draft', 'links');
			});

			editor.on('checkDirty', function(ev) {
				ev.data.isDirty = editor.checkDirty();
				ev.stop();
			}, null, null, 100);

			editor.on('quickSave', function() {
				draft.remove();
				draft.setKey(editor.config.mindtouch.pageId);
				draft.save();
			});

			editor.on('saveFailed', function() {
				if (Deki && Deki.Ui && draft.getTimestamp()) {
					var message = lang.contentsAutosaved.replace('%1', timeAgo());
					Deki.Ui.Flash(message);
				}
			});
		}
	});
})();

/**
 * Autosave interval in seconds.
 */
CKEDITOR.config.autosave_interval = 25;

/**
 * Draft won't be saved if the differences between length of previous and current
 * content less then this value.
 */
CKEDITOR.config.autosave_minLength = 20;

/**
 * Date format
 * %m - month, %d - day, %y - year
 * @default %m/%d/%y
 */
CKEDITOR.config.autosave_dateFormat = '%m/%d/%y';

/**
 * Time format
 * Possible values: 12H or 24H
 * @default 12H
 */
CKEDITOR.config.autosave_timeFormat = '12H';
