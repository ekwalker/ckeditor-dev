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

(function()
{
	var Video = function( dialog )
	{
		this.dialog = dialog;
		this.editor = dialog._.editor;
		this.lang = this.editor.lang['mindtouch/video'];

		this.$query = $( this.dialog.getContentElement( 'info', 'video' ).getInputElement().$ );
		this.$results = $( '#cke_video_results' );
		this.$videos = $( '#cke_video_videos' ).children().first();

		// preloader
		this.$query.after( '<div id="cke_video_loading" title="' + this.lang.loading + '"></div>' );
		this.$loading = $( '#cke_video_loading' );

		// video scroll
		this.$videosContainer = $( '#cke_video_videos' );

		// load Sly jQuery plugin
		var createSly = function()
		{
			this.sly = new Sly( this.$videosContainer,
				{
					horizontal : 0,
					scrollBar : '#cke_video_scrollbar',
					itemNav : 'basic',
					mouseDragging : 1,
					dragHandle : 1,
					dragging : 1,
					dynamicHandle : 1,
					scrollBy : 1,
					speed: 300,
					activateOn : 'click'
				});
		};

		if ( !jQuery.fn.sly )
		{
			var path = CKEDITOR.plugins.get( this.dialog.getName() ).path;
			CKEDITOR.scriptLoader.load( CKEDITOR.getUrl( path + 'js/sly.min.js' ), createSly, this );
		}
		else
		{
			createSly.call( this );
		}

		this.addPlaceholder();
	};

	Video.prototype =
	{
		page : 1,
		maxResults : 9,
		pending : 0,
		isResized : false,
		sly : null,
		youtubeUrlRegex : /youtube.com\/watch\?.*?v=([a-zA-Z0-9]*)(?:$|&)/i,
		
		onShow : function()
		{
			this.initEvents();
			this.initSly();
			this.update();

			this.dialog.resize( 600, 150 );
			this.dialog.layout();
			this.isResized = false;

			this.pending = 0;
		},

		onHide : function()
		{
			this.reset();
			this.sly && this.sly.destroy();
			this.removeEvents();
		},

		initSly : function()
		{
			var self = this;

			if ( !this.sly )
			{
				window.setTimeout( function()
					{
						self.initSly.call( self );
					}, 0 );
				return;
			}

			this.sly.init();

			// endless scroll: load more videos when scroll at the end
			this.sly.on( 'change', function()
				{
					if ( this.pos.dest > this.pos.end - 200 )
					{
						self.page++;
						self.searchYoutube();
					}
				});

			// activate item
			this.sly.on( 'active', function( ev, index )
				{
					var url = $( this.items[ index ].el ).data( 'video-url' );
					self.setVideoUrl( url );
				});
		},
		
		initEvents : function()
		{
			var self = this,
				timer;

			this.onInput = function()
			{
				if ( timer )
				{
					window.clearTimeout( timer );
				}

				timer = window.setTimeout( function ()
				{
					timer = null;
					self.$loading.show();
					self.update.call( self );
				}, 200 );
			};

			if ( this.checkOnInputSupport() )
			{
				this.$query.bind( 'input', this.onInput );
			}
			else
			{
				// fallback for old browsers 
				var lastValue = '';
				this.checkInputTimer = null;

				var checkInputChange = function()
				{
					var newValue = self.$query.val();

					if ( lastValue !== newValue )
					{
						lastValue = newValue;
						self.onInput();
					}
				};

				this.$query.focus(function()
				{
					self.checkInputTimer = setInterval( checkInputChange, 200 );
				}).blur(function()
				{
					clearInterval( self.checkInputTimer );
				});
			}

			// double click to insert video
			this.onInsert = function()
			{
				var url = $( this ).data( 'video-url' );
				self.setVideoUrl.call( self, url );
				self.dialog.getButton( 'ok' ).click();
			};

			this.onResize = function()
			{
				self.isResized = false;
				self.resize();
				self.sly && self.sly.reload();
			};

			this.$videos.delegate( 'li', 'dblclick', this.onInsert );

			CKEDITOR.document.getWindow().on( 'resize', this.onResize );
		},

		removeEvents : function()
		{
			this.$query.unbind( 'input', this.onInput );
			clearInterval( this.checkInputTimer );
			this.$videos.undelegate( 'li', 'dblclick', this.onInsert );
			CKEDITOR.document.getWindow().removeListener( 'resize', this.onResize );
		},

		addPlaceholder : function()
		{
			try
			{
				this.$query.attr(
					{
						'autocomplete' : 'off',
						'placeholder' : this.lang.placeholder
					});
			}
			catch ( e ) {}

			// placeholder polyfill
			if( !( 'placeholder' in this.$query[ 0 ] ) && !( 'placeHolder' in this.$query[ 0 ] ) )
			{
				this.$query.after( '<div class="placeholder">' + this.lang.placeholder + '</div>' );
			}
		},

		update : function()
		{
			var query = this.$query.val(),
				$placeholder = this.$query.parent().children( '.placeholder' );

			if ( $placeholder.length )
			{
				$placeholder[ query.length ? 'hide' : 'show' ]();
			}

			this.hideMessage();

			if ( !query.length || /^(?:https?|ftp|file)\:\/\//i.test( query ) )
			{
				this.reset();
				this.pending = 0;
				this.$loading.hide();
				this.setVideoUrl( query );
				this.dialog.layout();
			}
			else
			{
				this.page = 1;
				this.setVideoUrl( '' );
				this.searchYoutube();
			}
		},

		searchYoutube : function()
		{
			var self = this,
				query = this.$query.val();

			this.pending++;

			if ( this.page == 1 )
			{
				this.reset();
			}

			this.$loading.show();
			
			var onSuccess = function( data )
			{
				if ( data.error )
				{
					self.showMessage( self.lang.searchFailed + ': ' + ( data.error.message || '' ) );
					self.$loading.hide();
					return;
				}
				
				if ( data && data.data && data.data.totalItems == 0 )
				{
					self.showMessage( self.lang.notFound );
					self.$loading.hide();
					return;
				}
				
				var items = [];
				
				if ( data && data.data && data.data.items )
				{
					items = data.data.items;
				}
				else if ( data && data.data && data.data.id )
				{
					items.push( data.data );
				}

				window.setTimeout(function() {
					self.addYoutubeVideos.call( self, items );
				}, 0);
			};
			
			var url = 'https://gdata.youtube.com/feeds/api/videos',
				urlMatch = query.match( this.youtubeUrlRegex ),
				requestData =
					{
						'alt' : 'jsonc',
						'format' : 5,
						'v' : 2
					};
			
			if ( urlMatch )
			{
				// single video search by YouTube URL
				url += '/' + urlMatch[ 1 ] + '?callback=?';
			}
			else
			{
				// regular search by search query
				url += '?callback=?';
				$.extend( requestData,
					{
						'q' : query,
						'orderBy' : 'relevance',
						'max-results' : this.maxResults,
						'start-index' : ( this.page - 1 ) * this.maxResults + 1
					});
			}
				
			$.getJSON( url, requestData )
				.success( onSuccess )
				.error( function() {
					self.showMessage( self.lang.searchFailed );
					self.$loading.hide();
				})
				.complete( function() {
					self.searchInProgress = false;
					self.pending--;
				});
		},

		addYoutubeVideos : function( items )
		{
			var html = '', i;
			
			for ( i = 0 ; i < items.length ; i++ )
			{
				var video = items[ i ],
					thumb = video.thumbnail.sqDefault || video.thumbnail.hqDefault,
					url = video.content[ 5 ];

				html += '<li class="cke_video_item" data-video-id="' + video.id + '" data-video-url="' + url + '" data-video-title="' + CKEDITOR.tools.htmlEncodeAttr( video.title ) +'">' +
					'<div class="cke_video_thumb"><img src="' + thumb + '" width="120" height="90"></div>' +
					'<div class="cke_video_info">' +
						'<div class="cke_video_title">' + CKEDITOR.tools.htmlEncode( video.title ) + '</div>' +
						'<div class="cke_video_description">' + CKEDITOR.tools.htmlEncode( video.description ) + '</div>' +
					'</div>' +
				'</li>';
			}
			
			if ( html.length )
			{
				this.$videos.append( html );
				
				if ( !this.pending )
				{
					this.$results.show();

					CKEDITOR.tools.setTimeout( function()
						{
							this.sly.reload();
							this.$loading.hide();

							if ( this.page == 1 )
							{
								this.sly.toStart();
								this.sly.activate( 0 );
								this.resize();
							}
						}, 0, this );
				}
			}
		},

		setVideoUrl : function( url )
		{
			this.dialog.setValueOf( 'info', 'videoUrl', url );
		},
		
		showMessage : function( msg )
		{
			this.dialog.getContentElement( 'info', 'message' ).getElement().setHtml( msg );
		},

		hideMessage : function()
		{
			this.showMessage( '' );
		},

		reset : function()
		{
			this.page = 1;
			this.$results.hide();
			this.$videos.empty();
		},

		resize : function()
		{
			if ( this.isResized || !this.$videos.is(':visible') )
			{
				return false;
			}

			var viewportSize = CKEDITOR.document.getWindow().getViewPaneSize(),
				dialogSize = this.dialog.getSize(),
				height = Math.min(500, viewportSize.height - ( dialogSize.height - $( this.dialog.parts.contents.$ ).height() ));

			this.dialog.resize( 600, height );
			this.dialog.layout();

			var heightTop = 0;
			this.$results.parentsUntil( 'tr' ).parent().prevUntil( 'tbody' ).each(function()
				{
					heightTop += $( this ).height();
				});

			this.$videosContainer.css( 'height', height - heightTop + 'px' );

			this.isResized = true;
		},
		
		/**
		 * @link {http://danielfriesen.name/blog/2010/02/16/html5-browser-maze-oninput-support/}
		 */
		checkOnInputSupport : function()
		{
			// ie9 doesn't fire oninput event on backspace/del
			if ( CKEDITOR.env.ie9Compat )
			{
				return false;
			}

			var guid = 0,
				input = document.createElement( 'input' ),
				support = 'oninput' in input;

			if ( !support )
			{
				input.setAttribute( 'oninput', 'return;' );
				support = typeof input.oninput === 'function';
			}
			if ( !support )
			{
				try
				{
					var e = document.createEvent( 'KeyboardEvent' );
					e.initKeyEvent( 'keypress', true, true, window, false, false, false, false, 0, 'e'.charCodeAt( 0 ) );
					document.body.appendChild( input );
					input.addEventListener( 'input', function( e ) { support = true; e.preventDefault(); e.stopPropagation(); }, false );
					input.focus();
					input.dispatchEvent( e );
					document.body.removeChild( input );
				}
				catch( e ) {}
			}

			return support;
		}
	};

	CKEDITOR.dialog.add( 'mindtouch/video', function( editor )
	{
		var video,
			videoLang = editor.lang['mindtouch/video'],
			commonLang = editor.lang.common,
			path = CKEDITOR.plugins.get( 'mindtouch/video' ).path;

		return {
			title : videoLang.title,
			minWidth : 600,
			minHeight : 150,
			resizable : CKEDITOR.DIALOG_RESIZE_NONE,
			onLoad : function()
			{
				video = new Video( this );

				var helpLink = CKEDITOR.document.createElement( 'a' );
				helpLink.addClass( 'cke_video_help' );
				helpLink.setAttribute( 'href', 'http://help.mindtouch.us/?cid=mediaembed' );
				helpLink.setAttribute( 'target', '_blank' );
				helpLink.setHtml( videoLang.helpLink );
				this.parts.footer.append( helpLink );
			},
			onHide : function()
			{
				video.onHide();
			},
			onShow : function()
			{
				// Clear previously saved elements.
				this.fakeImage = this.videoNode = null;

				var fakeImage = this.getSelectedElement();
				if ( fakeImage && fakeImage.data( 'cke-real-element-type' ) == 'video' )
				{
					this.fakeImage = fakeImage;

					var videoNode = editor.restoreRealElement( fakeImage );
					this.videoNode = videoNode;

					this.setupContent( videoNode );
				}

				video.onShow();
			},
			onOk : function()
			{
				var videoNode;
				if ( !this.fakeImage )
					videoNode = new CKEDITOR.dom.element( 'img' );
				else
					videoNode = this.videoNode;

				// A subset of the specified attributes/styles
				// should also be applied on the fake element to
				// have better visual effect. (#5240)
				var extraStyles = {}, extraAttributes = {};
				this.commitContent( videoNode, extraStyles, extraAttributes );

				videoNode.addClass( 'mt-media' );
				videoNode.setAttribute( 'src', Deki.PathCommon + '/images/icon-video.png' );

				// Refresh the fake image.
				var newFakeImage = editor.createFakeElement( videoNode, 'cke_video', 'video', true );
				newFakeImage.setAttributes( extraAttributes );
				newFakeImage.setStyles( extraStyles );

				if ( this.fakeImage )
				{
					newFakeImage.replace( this.fakeImage );
					editor.getSelection().selectElement( newFakeImage );
				}
				else
				{
					editor.insertElement( newFakeImage );
				}
			},
			buttons : [
				CKEDITOR.dialog.okButton.override(
					{
						label : videoLang.insert
					}),
				CKEDITOR.dialog.cancelButton
			],
			contents : [
				{
					id : 'info',
					label : commonLang.generalTab,
					padding : 0,
					accessKey : 'I',
					elements :
					[
						{
							id : 'video',
							type : 'text',
							className : 'cke_video_url',
							label : videoLang.videoUrl,
							inputStyle : 'background: transparent url(' + path + 'images/search.png) scroll no-repeat 5px 50%; padding-left: 25px; line-height: 22px; outline: none; margin-top: 3px;',
							labelStyle : 'cursor: pointer; font-weight: bold;',
							setup : function( videoNode )
							{
								this.setValue( videoNode.getAttribute( 'media' ) );
							}
						},
						{
							id : 'videoUrl',
							type : 'text',
							label : videoLang.videoUrl,
							hidden : true,
							onChange : function()
							{
								this.getDialog().getButton( 'ok' )[ this.getValue().length ? 'enable' : 'disable' ]();
							},
							setup : function( videoNode )
							{
								this.setValue( videoNode.getAttribute( 'media' ) );
							},
							commit : function( videoNode )
							{
								videoNode.setAttribute( 'media', this.getValue() );
							}
						},
						{
							id : 'width',
							type : 'text',
							hidden : true,
							'default' : 640,
							label : commonLang.width,
							setup : function( videoNode )
							{
								var width = videoNode.getAttribute( 'width' ) || videoNode.getStyle( 'width' );
								width = parseInt( width, 10 )

								if ( !isNaN( width ) )
								{
									this.setValue( width );
								}
							},
							commit : function( videoNode )
							{
								videoNode.setAttribute( 'width', this.getValue() );
								videoNode.removeStyle( 'width' );
							}
						},
						{
							id : 'height',
							type : 'text',
							hidden : true,
							'default' : 360,
							label : commonLang.height,
							setup : function( videoNode )
							{
								var height = videoNode.getAttribute( 'height' ) || videoNode.getStyle( 'height' );
								height = parseInt( height, 10 );

								if ( !isNaN( height ) )
								{
									this.setValue( height );
								}
							},
							commit : function( videoNode )
							{
								videoNode.setAttribute( 'height', this.getValue() );
								videoNode.removeStyle( 'height' );
							}
						},
						{
							id : 'message',
							className : 'cke_video_message',
							type : 'html',
							html : ''
						},
						{
							type : 'html',
							html :
								'<div class="cke_video_results_wrapper">' +
									'<div class="cke_video_results" id="cke_video_results">' +
										'<p>' + videoLang.selectVideo + '</p>' +
										'<div id="cke_video_videos">' +
											'<ul></ul>' +
											'<div id="cke_video_scrollbar" class="cke_video_scrollbar"><div class="cke_video_handle"><div class="cke_video_mousearea"></div></div></div>' +
										'</div>' +
									'</div>' +
								'</div>' +
								'<style type="text/css">' +
									'.cke_video_url .cke_dialog_ui_input_text' +
									'{' +
									'	position: relative;' +
									'	-moz-box-sizing: border-box;' +
									'	-webkit-box-sizing: border-box;' +
									'	box-sizing: border-box;' +
									'}' +

									'.cke_video_url input:-ms-input-placeholder' +
									'{' +
									'	color: #999;' +
									'}' +

									'.cke_browser_ie7 .cke_video_url .cke_dialog_ui_input_text' +
									'{' +
									'	height: 22px !important;' +
									'}' +

									'.cke_video_url .placeholder' +
									'{' +
									'	position: absolute;' +
									'	top: 3px;' +
									'	left: 27px;' +
									'	color: #999;' +
									'	z-index: 1;' +
									'	line-height: 26px;' +
									'}' +

									'.cke_video_message' +
									'{' +
									'	display: block;' +
									'	font-weight: bold;' +
									'	text-align: center;' +
									'}' +

									'.cke_dialog .cke_dialog_footer .cke_video_help' +
									'{' +
									'	display: block;' +
									'	float: left;' +
									'	background: transparent url(/skins/common/icons/silk/help.png) scroll no-repeat 0 11px;' +
									'	padding-left: 18px;' +
									'	margin-left: 10px;' +
									'	outline: 0;' +
									'	line-height: 38px;' +
									'	color: #36c;' +
									'	text-decoration: underline;' +
									'}' +

									'.cke_video_results_wrapper' +
									'{' +
									'	width: 600px;' +
									'	position: relative;' +
									'	clear: both;' +
									'}' +

									'#cke_video_loading' +
									'{' +
									'	display: none;' +
									'	position: absolute;' +
									'	top: 11px;' +
									'	right: 5px;' +
									'	width: 16px;' +
									'	height: 16px;' +
									'	background: transparent url(/skins/common/images/ajax-loader-small.gif) scroll no-repeat 0 0;' +
									'}' +

									'#cke_video_results' +
									'{' +
									'	padding-top: 10px;' +
									'	*padding-top: 0;' +
									'	display: none;' +
									'}' +

									'#cke_video_results p' +
									'{' +
									'	font-weight: bold;' +
									'}' +

									'#cke_video_videos *' +
									'{' +
									'	-moz-box-sizing: border-box;' +
									'	-webkit-box-sizing: border-box;' +
									'	box-sizing: border-box;' +
									'}' +

									'#cke_video_videos' +
									'{' +
									'	height: 370px;' +
									'	position: relative;' +
									'}' +

									'#cke_video_videos ul' +
									'{' +
									'	margin: 0;' +
									'	padding: 0;' +
									'	list-style: none;' +
									'	width: 590px;' +
									'}' +

									'#cke_video_videos ul li' +
									'{' +
									'	overflow: hidden;' +
									'	width: 100%;' +
									'	height: 90px;' +
									'	opacity: 0.75;' +
									'	-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=75)";' +
  									'	*filter: alpha(opacity=75);' +
									'	border: 1px solid #ddd;' +
									'	border-bottom: none;' +
									'	position: relative;' +
									'	cursor: pointer !important;' +
									'}' +

									'#cke_video_videos ul li:hover' +
									'{' +
									'	opacity: 1;' +
									'	-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=100)";' +
									'	*filter: alpha(opacity=100);' +
									'}' +

									'#cke_video_videos ul li:last-child' +
									'{' +
									'	border-bottom: 1px solid #ddd;' +
									'}' +

									'#cke_video_videos ul li *' +
									'{' +
									'	cursor: pointer !important;' +
									'}' +

									'#cke_video_videos ul li.active' +
									'{' +
									'	background-color: #ddd;' +
									'	opacity: 1;' +
									'	-ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=100)";' +
  									'	*filter: alpha(opacity=100);' +
									'}' +

									'#cke_video_videos div.cke_video_thumb' +
									'{' +
									'	float: left;' +
									'}' +

									'#cke_video_videos div.cke_video_thumb img' +
									'{' +
									'	display: block;' +
									'	width: 120px;' +
									'	height: 90px;' +
									'}' +

									'#cke_video_videos div.cke_video_info' +
									'{' +
									'	padding: 10px;' +
									'	margin-left: 120px;' +
									'}' +

									'#cke_video_videos div.cke_video_title' +
									'{' +
									'	font-size: 1.5em;' +
									'	font-weight: bold;' +
									'	margin-bottom: 3px;' +
									'	white-space: normal;' +
									'}' +

									'#cke_video_videos div.cke_video_description' +
									'{' +
									'	white-space: normal;' +
									'}' +

									'#cke_video_videos .cke_video_scrollbar' +
									'{' +
									'	position: absolute;' +
									'	top: 0;' +
									'	bottom: 0;' +
									'	right: 0;' +
									'	width: 3px;' +
									'	background: #eee;' +
									'}' +

									'#cke_video_videos .cke_video_handle' +
									'{' +
									'	cursor: pointer;' +
									'	height: 100px;' +
									'	width: 100%;' +
									'	background: #292a33;' +
									'}' +

									'#cke_video_videos .cke_video_mousearea' +
									'{' +
									'	position: absolute;' +
									'	top: 0;' +
									'	left: -4px;' +
									'	width: 12px;' +
									'	height: 100%;' +
									'	cursor: pointer;' +
									'}' +
								'</style>'
						}
					]
				}
			]
		};
	});
})();
