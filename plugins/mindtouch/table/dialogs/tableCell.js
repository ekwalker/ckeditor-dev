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

CKEDITOR.dialog.add( 'cellProperties', function( editor )
	{
		var langTable = editor.lang.table,
			langCell = langTable.cell,
			langCommon = editor.lang.common,
			validate = CKEDITOR.dialog.validate,
			defaultToPixel = CKEDITOR.tools.cssLength,
			spacer = { type : 'html', html : '&nbsp;' };

		/**
		 *
		 * @param dialogName
		 * @param callback [ childDialog ]
		 */
		function getDialogValue( dialogName, callback )
		{
			var onOk = function()
			{
				releaseHandlers( this );
				callback( this, this._.parentDialog );
				this._.parentDialog.changeFocus();
			};
			var onCancel = function()
			{
				releaseHandlers( this );
				this._.parentDialog.changeFocus();
			};
			var releaseHandlers = function( dialog )
			{
				dialog.removeListener( 'ok', onOk );
				dialog.removeListener( 'cancel', onCancel );
			};
			var bindToDialog = function( dialog )
			{
				dialog.on( 'ok', onOk );
				dialog.on( 'cancel', onCancel );
			};
			editor.execCommand( dialogName );
			if ( editor._.storedDialogs.colordialog )
				bindToDialog( editor._.storedDialogs.colordialog );
			else
			{
				CKEDITOR.on( 'dialogDefinition', function( e )
				{
					if ( e.data.name != dialogName )
						return;

					var definition = e.data.definition;

					e.removeListener();
					definition.onLoad = CKEDITOR.tools.override( definition.onLoad, function( orginal )
					{
						return function()
						{
							bindToDialog( this );
							definition.onLoad = orginal;
							if ( typeof orginal == 'function' )
								orginal.call( this );
						};
					} );
				});
			}
		}

		// Synchronous field values to other impacted fields is required
		function commitInternally( targetFields )
		{
			var dialog = this.getDialog(),
				 element = dialog._element && dialog._element.clone()
						 || new CKEDITOR.dom.element( 'td', editor.document );

			// Commit this field and broadcast to target fields.
			this.commit( element );

			targetFields = [].concat( targetFields );
			var length = targetFields.length, field;
			for ( var i = 0; i < length; i++ )
			{
				field = dialog.getContentElement.apply( dialog, targetFields[ i ].split( ':' ) );
				field && field.setup && field.setup( element );
			}
		}

		// Registered 'CKEDITOR.style' instances.
		var styles = {} ;

		return {
			title : langCell.title,
			minWidth : CKEDITOR.env.ie && CKEDITOR.env.quirks ? 400 : 350,
			minHeight : CKEDITOR.env.ie && ( CKEDITOR.env.ie7Compat || CKEDITOR.env.quirks )?  230 : 220,
			contents : [
				{
					id : 'info',
					label : langCell.title,
					accessKey : 'I',
					elements :
					[
						{
							type : 'hbox',
							widths : [ '40%', '5%', '40%' ],
							children :
							[
								{
									type : 'vbox',
									padding : 0,
									children :
									[
										{
											type : 'hbox',
											widths : [ '5em' ],
											children :
											[
												{
													type : 'text',
													id : 'width',
													controlStyle : 'width:5em',
													label : langCommon.width,
													'default' : '',
													getValue : defaultToPixel,
													validate : validate.cssLength( editor.lang.common.invalidCssLength.replace( '%1', editor.lang.common.width ) ),

													setup : function( element )
													{
														var widthAttr = element.getAttribute( 'width' ),
															widthStyle = element.getStyle( 'width' );

														widthAttr && this.setValue( defaultToPixel( widthAttr ) );
														widthStyle && this.setValue( widthStyle );
													},
													commit : function( element )
													{
														var width = this.getValue();
														width ? element.setStyle( 'width', width ) : element.removeStyle( 'width' );

														element.removeAttribute( 'width' );
													}
												}
											]
										},
										{
											type : 'hbox',
											widths : [ '5em' ],
											children :
											[
												{
													type : 'text',
													id : 'height',
													label : langCommon.height,
													controlStyle : 'width:5em',
													'default' : '',
													getValue : defaultToPixel,
													validate : validate.cssLength( editor.lang.common.invalidCssLength.replace( '%1', editor.lang.common.height ) ),

													setup : function( element )
													{
														var heightAttr = element.getAttribute( 'height' ),
															heightStyle = element.getStyle( 'height' );

														heightAttr && this.setValue( defaultToPixel( heightAttr ) );
														heightStyle && this.setValue( heightStyle );
													},
													commit : function( element )
													{
														var height = this.getValue();
														height ? element.setStyle( 'height', height ) : element.removeStyle( 'height' );

														element.removeAttribute( 'height' );
													}
												}
											]
										},
										spacer,
										{
											type : 'select',
											id : 'wordWrap',
											label : langCell.wordWrap,
											'default' : 'yes',
											items :
											[
												[ langCell.yes, 'yes' ],
												[ langCell.no, 'no' ]
											],
											setup : function( element )
											{
												var wordWrapAttr = element.getAttribute( 'noWrap' ),
													wordWrapStyle = element.getStyle( 'white-space' );

												if ( wordWrapStyle == 'nowrap' || wordWrapAttr )
													this.setValue( 'no' );
											},
											commit : function( element )
											{
												if ( this.getValue() == 'no' )
													element.setStyle( 'white-space', 'nowrap' );
												else
													element.removeStyle( 'white-space' );

												element.removeAttribute( 'noWrap' );
											}
										},
										spacer,
										{
											type : 'select',
											id : 'hAlign',
											label : langCell.hAlign,
											'default' : '',
											items :
											[
												[ langCommon.notSet, '' ],
												[ langCommon.alignLeft, 'left' ],
												[ langCommon.alignCenter, 'center' ],
												[ langCommon.alignRight, 'right' ]
											],
											setup : function( element )
											{
												var alignAttr = element.getAttribute( 'align' ),
													textAlignStyle = element.getStyle( 'text-align');

												this.setValue(  textAlignStyle || alignAttr || '' );
											},
											commit : function( selectedCell )
											{
												var value = this.getValue();

												if ( value )
													selectedCell.setStyle( 'text-align', value );
												else
													selectedCell.removeStyle( 'text-align' );

												selectedCell.removeAttribute( 'align' );
											}
										},
										{
											type : 'select',
											id : 'vAlign',
											label : langCell.vAlign,
											'default' : '',
											items :
											[
												[ langCommon.notSet, '' ],
												[ langCommon.alignTop, 'top' ],
												[ langCommon.alignMiddle, 'middle' ],
												[ langCommon.alignBottom, 'bottom' ],
												[ langCell.alignBaseline, 'baseline' ]
											],
											setup : function( element )
											{
												var vAlignAttr = element.getAttribute( 'vAlign' ),
													vAlignStyle = element.getStyle( 'vertical-align' );

												switch( vAlignStyle )
												{
													// Ignore all other unrelated style values..
													case 'top':
													case 'middle':
													case 'bottom':
													case 'baseline':
														break;
													default:
														vAlignStyle = '';
												}

												this.setValue( vAlignStyle || vAlignAttr || '' );
											},
											commit : function( element )
											{
												var value = this.getValue();

												if ( value )
													element.setStyle( 'vertical-align', value );
												else
													element.removeStyle( 'vertical-align' );

												element.removeAttribute( 'vAlign' );
											}
										}
									]
								},
								spacer,
								{
									type : 'vbox',
									padding : 0,
									children :
									[
										{
											type : 'select',
											id : 'cellType',
											label : langCell.cellType,
											'default' : 'td',
											items :
											[
												[ langCell.data, 'td' ],
												[ langCell.header, 'th' ]
											],
											setup : function( selectedCell )
											{
												this.setValue( selectedCell.getName() );
											},
											commit : function( selectedCell )
											{
												selectedCell.renameNode( this.getValue() );
											}
										},
										spacer,
										{
											type : 'text',
											id : 'rowSpan',
											label : langCell.rowSpan,
											'default' : '',
											validate : validate.integer( langCell.invalidRowSpan ),
											setup : function( selectedCell )
											{
												var attrVal = parseInt( selectedCell.getAttribute( 'rowSpan' ), 10 );
												if ( attrVal && attrVal  != 1 )
												 	this.setValue(  attrVal );
											},
											commit : function( selectedCell )
											{
												var value = parseInt( this.getValue(), 10 );
												if ( value && value != 1 )
													selectedCell.setAttribute( 'rowSpan', this.getValue() );
												else
													selectedCell.removeAttribute( 'rowSpan' );
											}
										},
										{
											type : 'text',
											id : 'colSpan',
											label : langCell.colSpan,
											'default' : '',
											validate : validate.integer( langCell.invalidColSpan ),
											setup : function( element )
											{
												var attrVal = parseInt( element.getAttribute( 'colSpan' ), 10 );
												if ( attrVal && attrVal  != 1 )
												 	this.setValue(  attrVal );
											},
											commit : function( selectedCell )
											{
												var value = parseInt( this.getValue(), 10 );
												if ( value && value != 1 )
													selectedCell.setAttribute( 'colSpan', this.getValue() );
												else
													selectedCell.removeAttribute( 'colSpan' );
											}
										},
										spacer,
										{
											type : 'select',
											id : 'selCellsUpdate',
											label : '',
											'default' : '',
											items :
											[
												[ langCell.updateSelected, 'selected' ],
												[ langCell.updateRow, 'row' ],
												[ langCell.updateColumn, 'column' ],
												[ langCell.updateTable, 'table' ]
											],
											setup : function( selectedCell )
											{
												this.setValue( 'selected' );
											}
										}
									]
								}
							]
						}
					]
				},

				{
					id : 'advanced',
					label : langCommon.advancedTab,
					accessKey : 'A',
					elements :
					[
						{
							type : 'hbox',
							widths : [ '30%', '40%', '30%' ],
							children :
							[
								{
									id : 'cmbStyle',
									type : 'select',
									'default' : '',
									label : langCommon.styles,
									controlStyle : 'width:8em',
									// Options are loaded dynamically.
									items :
									[
										[ langCommon.notSet , '' ]
									],
									onChange : function()
									{
										if ( this.getValue().length )
										{
											commitInternally.call( this,
												[
													'info:width',
													'info:widthType',
													'info:height',
													'info:wordWrap',
													'info:hAlign',
													'info:vAlign',
													'advanced:txtGenClass',
													'advanced:txtId',
													'advanced:borderWidth',
													'advanced:borderStyle',
													'advanced:bgImage',
													'advanced:borderColor',
													'advanced:bgColor'
												] );
										}
									},
									setup : function( selectedCell )
									{
										for ( var name in styles )
											styles[ name ].checkElementRemovable( selectedCell, true ) && this.setValue( name );
									},
									commit: function( selectedCell )
									{
										var styleName;
										if ( ( styleName = this.getValue() ) )
											styles[ styleName ].applyToObject( selectedCell );
									}
								},

								{
									type : 'text',
									id : 'txtGenClass',
									label : langCommon.cssClasses,
									'default' : '',
									controlStyle : 'width:13em',
									setup : function( selectedCell )
									{
										this.setValue( selectedCell.getAttribute( 'class' ) );
									},
									commit : function( selectedCell )
									{
										if ( this.getValue() )
											selectedCell.setAttribute( 'class', this.getValue() );
										else
											selectedCell.removeAttribute( 'class' );
									}
								},
								{
									type : 'text',
									id : 'txtId',
									label : langCommon.id,
									'default' : '',
									setup : function( selectedCell )
									{
										this.setValue( selectedCell.getAttribute( 'id' ) );
									}
								}
							]
						},
						{
							type : 'hbox',
							widths : [ '30%', '20%', '50%' ],
							padding : 0,
							children :
							[
								{
									type : 'hbox',
									padding : 0,
									widths : [ '5em' ],
									children :
									[
										{
											type : 'text',
											id : 'borderWidth',
											controlStyle : 'width:5em; margin-right:.5em',
											label : langTable.borderWidth,
											'default' : '',
											setup : function( selectedCell )
											{
												var width = CKEDITOR.tools.normalizeCssValue( selectedCell, 'border-width' );
												this.setValue( width || '' );
											},
											commit : function( selectedCell )
											{
												if ( this.getValue() )
													selectedCell.setStyle( 'border-width', this.getValue() + 'px' );
												else
													selectedCell.removeStyle( 'border-width' );
											}
										},
										{
											type : 'html',
											html : '<br />' + langTable.widthPx
										}
									]
								},
								{
									type : 'select',
									id : 'borderStyle',
									label : langTable.borderStyle,
									'default' : '',
									items :
									[
										[ 'none', '' ],
										[ 'solid', 'solid' ],
										[ 'dashed', 'dashed' ],
										[ 'dotted', 'dotted' ],
										[ 'double', 'double' ],
										[ 'hidden', 'hidden' ],
										[ 'groove', 'groove' ],
										[ 'ridge', 'ridge' ],
										[ 'inset', 'inset' ],
										[ 'outset', 'outset' ]
									],
									setup : function( selectedCell )
									{
										var style = CKEDITOR.tools.normalizeCssValue( selectedCell, 'border-style' );
										this.setValue( style || '' );
									},
									commit : function( selectedCell )
									{
										if ( this.getValue() )
											selectedCell.setStyle( 'border-style', this.getValue() );
										else
											selectedCell.removeStyle( 'border-style' );
									}
								},
								{
									type : 'text',
									id : 'bgImage',
									label : langTable.bgImage,
									'default' : '',
									setup : function( selectedCell )
									{
										var image = CKEDITOR.tools.normalizeCssValue( selectedCell, 'background-image' );
										this.setValue( image || '' );
									},
									commit : function( selectedCell )
									{
										if ( this.getValue() )
											selectedCell.setStyle( 'background-image', "url('" + this.getValue() + "')" );
										else
											selectedCell.removeStyle( 'background-image' );
									}
								}

							]
						},
						{
							type : 'hbox',
							padding : 0,
							widths : [ '50%', '50%' ],
							children :
							[
								{
									type : 'text',
									id : 'borderColor',
									label : langCell.borderColor,
									'default' : '',
									setup : function( selectedCell )
									{
										var color = CKEDITOR.tools.normalizeCssValue( selectedCell, 'border-color' );
										this.setValue( color || '' );
									},
									commit : function( selectedCell )
									{
										if ( this.getValue() )
											selectedCell.setStyle( 'border-color', CKEDITOR.tools.convertHexToRgb( this.getValue() ) );
										else
											selectedCell.removeStyle( 'border-color' );

										selectedCell.removeAttribute( 'borderColor');
									}
								},
								{
									type : 'button',
									id : 'borderColorChoose',
									"class" : 'colorChooser',
									label : langCell.chooseColor,
									onLoad : function()
									{
										// Stick the element to the bottom (#5587)
										this.getElement().getParent().setStyle( 'vertical-align', 'bottom' );
									},
									onClick : function()
									{
										var self = this;
										getDialogValue( 'colordialog', function( colorDialog )
										{
											self.getDialog().getContentElement( 'advanced', 'borderColor' ).setValue(
												colorDialog.getContentElement( 'picker', 'selectedColor' ).getValue()
											);
										} );
									}
								}
							]
						},
						{
							type : 'hbox',
							padding : 0,
							widths : [ '50%', '50%' ],
							children :
							[
								{
									type : 'text',
									id : 'bgColor',
									label : langCell.bgColor,
									'default' : '',
									setup : function( selectedCell )
									{
										var color = CKEDITOR.tools.normalizeCssValue( selectedCell, 'background-color' );
										this.setValue( color || '' );
									},
									commit : function( selectedCell )
									{
										if ( this.getValue() )
											selectedCell.setStyle( 'background-color', CKEDITOR.tools.convertHexToRgb( this.getValue() ) );
										else
											selectedCell.removeStyle( 'background-color' );

										selectedCell.removeAttribute( 'bgColor');
									}
								},
								{
									type : 'button',
									id : 'bgColorChoose',
									"class" : 'colorChooser',
									label : langCell.chooseColor,
									onLoad : function()
									{
										// Stick the element to the bottom (#5587)
										this.getElement().getParent().setStyle( 'vertical-align', 'bottom' );
									},
									onClick : function()
									{
										var self = this;
										getDialogValue( 'colordialog', function( colorDialog )
										{
											self.getDialog().getContentElement( 'advanced', 'bgColor' ).setValue(
												colorDialog.getContentElement( 'picker', 'selectedColor' ).getValue()
											);
										} );
									}
								}
							]
						}
					]
				}

			],
			onLoad : function()
			{
				// Preparing for the 'elementStyle' field.
				var dialog = this,
					stylesField = this.getContentElement( 'advanced', 'cmbStyle' );

				editor.getStylesSet( function( stylesDefinitions )
				{
					var styleName;

					if ( stylesDefinitions )
					{
						// Digg only those styles that apply to table cell.
						for ( var i = 0 ; i < stylesDefinitions.length ; i++ )
						{
							var styleDefinition = stylesDefinitions[ i ];
							if ( styleDefinition.element &&
								( styleDefinition.element == 'td' || styleDefinition.element == 'th' ) )
							{
								styleName = styleDefinition.name;
								styles[ styleName ] = new CKEDITOR.style( styleDefinition );

								// Populate the styles field options with style name.
								stylesField.items.push( [ styleName, styleName ] );
								stylesField.add( styleName, styleName );
							}
						}
					}

					// We should disable the content element
					// it if no options are available at all.
					stylesField[ stylesField.items.length > 1 ? 'enable' : 'disable' ]();

					// Now setup the field value manually.
					setTimeout( function() { stylesField.setup( dialog._element ); }, 0 );
				} );
			},
			onShow : function()
			{
				this.cells = CKEDITOR.plugins.tabletools.getSelectedCells(
					this._.editor.getSelection() );
				this.setupContent( this.cells[ 0 ] );
			},
			onOk : function()
			{
				var cellsToUpdate = this.getContentElement( 'info', 'selCellsUpdate' ).getValue(),
					cells = [];

				var selection = this._.editor.getSelection(),
					bookmarks = selection.createBookmarks();

				switch ( cellsToUpdate )
				{
					case 'selected':
						cells = this.cells;
						break;
					case 'row':
						if ( this.cells.length )
						{
							var row = this.cells[ 0 ].getAscendant( 'tr' );
							if ( row )
							{
								cells = row.$.cells;
							}
						}
						break;
					case 'column':
						var table = this.cells[ 0 ].getAscendant( 'table' ),
							i, j, cellIndexes = [];
						
						for ( i = 0 ; i < this.cells.length ; i++ )
						{
							cellIndexes.push( this.cells[ i ].$.cellIndex );
						}

						if ( table )
						{
							for ( i = 0 ; i < table.$.rows.length ; i++ )
							{
								for ( j = 0 ; j < cellIndexes.length ; j++ )
								{
									cells.push( table.$.rows[ i ].cells[ cellIndexes[ j ] ] );
								}
							}
						}
						break;
					case 'table':
						if ( this.cells.length )
						{
							var table = this.cells[ 0 ].getAscendant( 'table' ),
								i, j;

							if ( table )
							{
								for ( i = 0 ; i < table.$.rows.length ; i++ )
								{
									for ( j = 0 ; j < table.$.rows[ i ].cells.length ; j++ )
									{
										cells.push( table.$.rows[ i ].cells[ j ] );
									}
								}
							}
						}
						break;
				}

				for ( var i = 0 ; i < cells.length ; i++ )
				{
					var cell = cells[ i ];

					if ( !(cell instanceof CKEDITOR.dom.element) )
						cell = new CKEDITOR.dom.element( cell );

					this.commitContent( cell );

					// apply id to the first cell only
					if ( i == 0 )
					{
						var id = this.getContentElement( 'advanced', 'txtId' ).getValue();

						if ( id )
							cell.setAttribute( 'id', id );
						else
							cell.removeAttribute( 'id' );
					}

					// Remove empty 'style' attribute.
					!cell.getAttribute( 'style' ) && cell.removeAttribute( 'style' );
				}

				this._.editor.forceNextSelectionCheck();
				selection.selectBookmarks( bookmarks );
				this._.editor.selectionChange();
			},
			onHide : function()
			{
				delete this._element;
			}
		};
	} );
