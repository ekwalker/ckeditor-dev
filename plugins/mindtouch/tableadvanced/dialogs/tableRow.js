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

CKEDITOR.dialog.add( 'rowProperties', function( editor )
	{
		var langTable = editor.lang.table,
			langCell = langTable.cell,
			langRow = langTable.row,
			langCommon = editor.lang.common,
			validate = CKEDITOR.dialog.validate;

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
				this._.parentDialog.changeFocus( true );
			};
			var onCancel = function()
			{
				releaseHandlers( this );
				this._.parentDialog.changeFocus();
			};
			var bindToDialog = function( dialog )
			{
				dialog.on( 'ok', onOk );
				dialog.on( 'cancel', onCancel );
			};
			var releaseHandlers = function( dialog )
			{
				dialog.removeListener( 'ok', onOk );
				dialog.removeListener( 'cancel', onCancel );
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
						 || new CKEDITOR.dom.element( 'tr', editor.document );

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
			title : langRow.title,
			minWidth : CKEDITOR.env.ie && CKEDITOR.env.quirks ? 400 : 330,
			minHeight : CKEDITOR.env.ie && ( CKEDITOR.env.ie7Compat || CKEDITOR.env.quirks )?  180 : 140,
			contents : [
				{
					id : 'info',
					label : langRow.title,
					accessKey : 'I',
					elements :
					[
						{
							type : 'hbox',
							widths : [ '5em' ],
							children :
							[
								{
									type : 'text',
									id : 'height',
									controlStyle : 'width:5em',
									label : langCommon.height,
									'default' : '',
									getValue : CKEDITOR.tools.cssLength,
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
						{
							type : 'select',
							id : 'part',
							label : langRow.partOf,
							'default' : 'tbody',
							items :
							[
								[ langRow.tHead, 'thead' ],
								[ langRow.tBody, 'tbody' ],
								[ langRow.tFoot, 'tfoot' ]
							],
							setup : function( selectedRow )
							{
								switch ( selectedRow.getParent().getName() )
								{
									case 'thead' :
										this.setValue( 'thead' );
										break;
									case 'tfoot' :
										this.setValue( 'tfoot' );
										break;
									default :
										this.setValue( 'tbody' );
										break;
								}
							}
						},
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
							commit : function( selectedRow )
							{
								var value = this.getValue();

								if ( value )
									selectedRow.setStyle( 'text-align', value );
								else
									selectedRow.removeStyle( 'text-align' );

								selectedRow.removeAttribute( 'align' );
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
						},
						{
							type : 'select',
							id : 'selRowsUpdate',
							label : '',
							'default' : 'selected',
							items :
							[
								[ langRow.updateSelected, 'selected' ],
								[ langRow.updateOdd, 'odd' ],
								[ langRow.updateEven, 'even' ],
								[ langRow.updateAll, 'all' ]
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
													'info:height',
													'info:hAlign',
													'info:vAlign',
													'advanced:txtGenClass',
													'advanced:txtId',
													'advanced:bgImage',
													'advanced:bgColor'
												] );
										}
									},
									setup : function( selectedRow )
									{
										for ( var name in styles )
											styles[ name ].checkElementRemovable( selectedRow, true ) && this.setValue( name );
									},
									commit: function( selectedRow )
									{
										var styleName;
										if ( ( styleName = this.getValue() ) )
											styles[ styleName ].applyToObject( selectedRow );
									}
								},

								{
									type : 'text',
									id : 'txtGenClass',
									label : langCommon.cssClasses,
									'default' : '',
									controlStyle : 'width:13em',
									setup : function( selectedRow )
									{
										this.setValue( selectedRow.getAttribute( 'class' ) );
									},
									commit : function( selectedRow )
									{
										if ( this.getValue() )
											selectedRow.setAttribute( 'class', this.getValue() );
										else
											selectedRow.removeAttribute( 'class' );
									}
								},
								{
									type : 'text',
									id : 'txtId',
									label : langCommon.id,
									'default' : '',
									setup : function( selectedRow )
									{
										this.setValue( selectedRow.getAttribute( 'id' ) );
									}
								}
							]
						},
						{
							type : 'text',
							id : 'bgImage',
							label : editor.lang.table.bgImage,
							'default' : '',
							setup : function( selectedRow )
							{
								var image = CKEDITOR.tools.normalizeCssValue( selectedRow, 'background-image' );
								this.setValue( image || '' );
							},
							commit : function( selectedRow )
							{
								if ( this.getValue() )
									selectedRow.setStyle( 'background-image', "url('" + this.getValue() + "')" );
								else
									selectedRow.removeStyle( 'background-image' );
							}
						},
						{
							type : 'hbox',
							padding : 0,
							widths : [ '80%', '20%' ],
							children :
							[
								{
									type : 'text',
									id : 'bgColor',
									label : langCell.bgColor,
									'default' : '',
									setup : function( selectedRow )
									{
										var color = CKEDITOR.tools.normalizeCssValue( selectedRow, 'background-color' );
										this.setValue( color || '' );
									},
									commit : function( selectedRow )
									{
										if ( this.getValue() )
											selectedRow.setStyle( 'background-color', CKEDITOR.tools.convertHexToRgb( this.getValue() ) );
										else
											selectedRow.removeStyle( 'background-color' );

										selectedRow.removeAttribute( 'bgColor');
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
						// Digg only those styles that apply to 'tr'.
						for ( var i = 0 ; i < stylesDefinitions.length ; i++ )
						{
							var styleDefinition = stylesDefinitions[ i ];
							if ( styleDefinition.element && styleDefinition.element == 'tr' )
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

				if ( this.cells.length == 0 )
					return;

				this.rows = [];

				var i, row, indexes = {};

				for ( i = 0 ; i < this.cells.length ; i++ )
				{
					row = this.cells[i].getAscendant( 'tr' );

					if ( !indexes[ 'index' + row.$.rowIndex ] )
					{
						indexes[ 'index' + row.$.rowIndex ] = 1;
						this.rows.push( row );
					}
				}

				this.firstRow = this.rows.shift();
				this.rows.unshift( this.firstRow );

				this.setupContent( this.firstRow );
			},
			onOk : function()
			{
				if ( this.cells.length == 0 )
					return;

				var editor = this._.editor,
					rowsToUpdate = this.getContentElement( 'info', 'selRowsUpdate' ).getValue(),
					table = this.firstRow.getAscendant( 'table' ),
					i, rows = [], allRows, lockRowsPart = false;

				switch ( rowsToUpdate )
				{
					case 'selected' :
						rows = this.rows;
						break;
					case 'all' :
						allRows = table.getElementsByTag( 'tr' );
						for ( i = allRows.count() - 1 ; i >= 0 ; i-- )
						{
							rows.push( allRows.getItem( i ) );
						}
						break;
					case 'odd' :
					case 'even' :
						lockRowsPart = true;
						allRows = table.getElementsByTag( 'tr' );
						for ( i = allRows.count() - 1 ; i >= 0 ; i-- )
						{
							if ( ( i % 2 == 0 && rowsToUpdate == 'odd' ) ||
								 ( i % 2 != 0 && rowsToUpdate == 'even' ) )
							{
								rows.push( allRows.getItem( i ) );
							}
						}
						break;
				}

				// array with moved rows
				var newRows = [];

				for ( var rowIndex = 0 ; rowIndex < rows.length ; rowIndex++ )
				{
					var row = rows[ rowIndex ];

					this.commitContent( row );

					// apply id to the first row only
					if ( rowIndex == 0 )
					{
						var id = this.getContentElement( 'advanced', 'txtId' ).getValue();

						if ( id )
							row.setAttribute( 'id', id );
						else
							row.removeAttribute( 'id' );
					}

					// Remove empty 'style' attribute.
					!row.getAttribute( 'style' ) && row.removeAttribute( 'style' );

					// move rows to other table's part
					var partNodeName = this.getContentElement( 'info', 'part' ).getValue();

					if ( !lockRowsPart && partNodeName != row.getParent().getName() )
					{
						// first, clone the node we are working on
						var newRow = row.clone( true, true );

						// next, find the parent of its new destination (creating it if necessary)
						var partNode = null,
							tableChildren = table.getChildren();

						for ( i = tableChildren.count() - 1 ; i >= 0 ; i-- )
						{
							var child = tableChildren.getItem( i );
							if ( child.getName() == partNodeName )
								partNode = child;
						}

						if ( partNode === null )
						{
							partNode = editor.document.createElement( partNodeName );

							if ( partNodeName == 'thead' )
							{
								var first = table.getFirst();
								if ( first.getName() == 'caption' )
									partNode.insertAfter( first );
								else
									partNode.insertBefore( first );
							}
							else
								table.append( partNode );
						}

						// remove the original
						if ( row.getParent().getChildCount() == 1 )
						{
							row.getParent().remove();
						}
						else
						{
							row.remove();
						}

						// append the row to the new parent
						partNode.append( newRow );

						// store the new row
						newRows.push( newRow );
					}
				}

				// if we've moved rows to other table's part
				// select them to restore selection
				if ( newRows.length )
				{
					var j, cell, range, ranges = [],
						selection = editor.getSelection();

					selection.reset();

					for ( i = 0 ; i < newRows.length ; i++ )
					{
						for ( j = 0 ; j < newRows[i].$.cells.length ; j++ )
						{
							cell = new CKEDITOR.dom.element( newRows[ i ].$.cells[ j ] );

							range = new CKEDITOR.dom.range( editor.document );
							range.setStartAt( cell, CKEDITOR.POSITION_AFTER_START );
							range.setEndAt( cell, CKEDITOR.POSITION_BEFORE_END );

							ranges.push( range );
						}
					}

					selection.selectRanges( ranges );
				}
			},
			onHide : function()
			{
				delete this._element;
			}
		};
	} );
