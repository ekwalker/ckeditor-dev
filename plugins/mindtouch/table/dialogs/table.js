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
	var defaultToPixel = CKEDITOR.tools.cssLength;

	var commitValue = function( data )
	{
		var id = this.id;
		if ( !data.info )
			data.info = {};
		data.info[id] = this.getValue();
	};

	function tableColumns( table )
	{
		var cols = 0, maxCols = 0;
		for ( var i = 0, row, rows = table.$.rows.length; i < rows; i++ )
		{
			row = table.$.rows[ i ], cols = 0;
			for ( var j = 0, cell, cells = row.cells.length; j < cells; j++ )
			{
				cell = row.cells[ j ];
				cols += cell.colSpan;
			}

			cols > maxCols && ( maxCols = cols );
		}

		return maxCols;
	}


	// Whole-positive-integer validator.
	function validatorNum( msg )
	{
		return function()
		{
			var value = this.getValue(),
				pass = !!( CKEDITOR.dialog.validate.integer()( value ) && value > 0 );

			if ( !pass )
			{
				alert( msg );
				this.select();
			}

			return pass;
		};
	}

	function tableDialog( editor, command )
	{
		/**
		 *
		 * @param dialogName
		 * @param callback [ childDialog ]
		 */
		var getDialogValue = function( dialogName, callback )
		{
			var onOk = function()
			{
				releaseHandlers( this );
				callback( this );
			};
			var onCancel = function()
			{
				releaseHandlers( this );
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
		};
		
		var makeElement = function( name )
			{
				return new CKEDITOR.dom.element( name, editor.document );
			};

		// Synchronous field values to other impacted fields is required
		function commitInternally( targetFields )
		{
			var dialog = this.getDialog(),
				 element = dialog._element && dialog._element.clone()
						 || new CKEDITOR.dom.element( 'table', editor.document );

			// Commit this field and broadcast to target fields.
			var data = {};
			this.commit( data, element );

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
			title : editor.lang.table.title,
			minWidth : 350,
			minHeight : CKEDITOR.env.ie ? 310 : 280,
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
						// Digg only those styles that apply to 'table'.
						for ( var i = 0 ; i < stylesDefinitions.length ; i++ )
						{
							var styleDefinition = stylesDefinitions[ i ];
							if ( styleDefinition.element && styleDefinition.element == 'table' )
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
				// Detect if there's a selected table.
				var selection = editor.getSelection(),
					ranges = selection.getRanges(),
					selectedTable = null;

				var rowsInput = this.getContentElement( 'info', 'txtRows' ),
					colsInput = this.getContentElement( 'info', 'txtCols' ),
					widthInput = this.getContentElement( 'info', 'txtWidth' );
				if ( command == 'tableProperties' )
				{
					if ( ( selectedTable = selection.getSelectedElement() ) )
						selectedTable = selectedTable.getAscendant( 'table', true );
					else if ( ranges.length > 0 )
					{
						// Webkit could report the following range on cell selection (#4948):
						// <table><tr><td>[&nbsp;</td></tr></table>]
						if ( CKEDITOR.env.webkit )
							ranges[ 0 ].shrink( CKEDITOR.NODE_ELEMENT );

						var rangeRoot = ranges[0].getCommonAncestor( true );
						selectedTable = rangeRoot.getAscendant( 'table', true );
					}

					// Save a reference to the selected table, and push a new set of default values.
					this._.selectedElement = selectedTable;
				}

				// Enable, disable and select the row, cols, width fields.
				if ( selectedTable )
				{
					this.setupContent( selectedTable );
					rowsInput && rowsInput.disable();
					colsInput && colsInput.disable();
					widthInput && widthInput.select();
				}
				else
				{
					rowsInput && rowsInput.enable();
					colsInput && colsInput.enable();
					rowsInput && rowsInput.select();
				}
			},
			onOk : function()
			{
				var selection = editor.getSelection(),
					bms = this._.selectedElement && selection.createBookmarks();

				var table = this._.selectedElement || makeElement( 'table' ),
					me = this,
					data = {};

				this.commitContent( data, table );

				if ( data.info )
				{
					var info = data.info;

					// Generate the rows and cols.
					if ( !this._.selectedElement )
					{
						var tbody = table.append( makeElement( 'tbody' ) ),
							rows = parseInt( info.txtRows, 10 ) || 0,
							cols = parseInt( info.txtCols, 10 ) || 0;

						for ( var i = 0 ; i < rows ; i++ )
						{
							var row = tbody.append( makeElement( 'tr' ) );
							for ( var j = 0 ; j < cols ; j++ )
							{
								var cell = row.append( makeElement( 'td' ) );
								if ( !CKEDITOR.env.ie )
									cell.append( makeElement( 'br' ) );
							}
						}
					}

					// Modify the table headers. Depends on having rows and cols generated
					// correctly so it can't be done in commit functions.

					// Should we make a <thead>?
					var headers = info.selHeaders;
					if ( !table.$.tHead && ( headers == 'row' || headers == 'both' ) )
					{
						var thead = new CKEDITOR.dom.element( table.$.createTHead() );
						tbody = table.getElementsByTag( 'tbody' ).getItem( 0 );
						var theRow = tbody.getElementsByTag( 'tr' ).getItem( 0 );

						// Change TD to TH:
						for ( i = 0 ; i < theRow.getChildCount() ; i++ )
						{
							var th = theRow.getChild( i );
							// Skip bookmark nodes. (#6155)
							if ( th.type == CKEDITOR.NODE_ELEMENT && !th.data( 'cke-bookmark' ) )
							{
								th.renameNode( 'th' );
								th.setAttribute( 'scope', 'col' );
							}
						}
						thead.append( theRow.remove() );
					}

					if ( table.$.tHead !== null && !( headers == 'row' || headers == 'both' ) )
					{
						// Move the row out of the THead and put it in the TBody:
						thead = new CKEDITOR.dom.element( table.$.tHead );
						tbody = table.getElementsByTag( 'tbody' ).getItem( 0 );

						var previousFirstRow = tbody.getFirst();
						while ( thead.getChildCount() > 0 )
						{
							theRow = thead.getFirst();
							for ( i = 0; i < theRow.getChildCount() ; i++ )
							{
								var newCell = theRow.getChild( i );
								if ( newCell.type == CKEDITOR.NODE_ELEMENT )
								{
									newCell.renameNode( 'td' );
									newCell.removeAttribute( 'scope' );
								}
							}
							theRow.insertBefore( previousFirstRow );
						}
						thead.remove();
					}

					// Should we make all first cells in a row TH?
					if ( !this.hasColumnHeaders && ( headers == 'col' || headers == 'both' ) )
					{
						for ( row = 0 ; row < table.$.rows.length ; row++ )
						{
							newCell = new CKEDITOR.dom.element( table.$.rows[ row ].cells[ 0 ] );
							newCell.renameNode( 'th' );
							newCell.setAttribute( 'scope', 'row' );
						}
					}

					// Should we make all first TH-cells in a row make TD? If 'yes' we do it the other way round :-)
					if ( ( this.hasColumnHeaders ) && !( headers == 'col' || headers == 'both' ) )
					{
						for ( i = 0 ; i < table.$.rows.length ; i++ )
						{
							row = new CKEDITOR.dom.element( table.$.rows[i] );
							if ( row.getParent().getName() == 'tbody' )
							{
								newCell = new CKEDITOR.dom.element( row.$.cells[0] );
								newCell.renameNode( 'td' );
								newCell.removeAttribute( 'scope' );
							}
						}
					}

					// Remove empty 'style' attribute.
					!table.getAttribute( 'style' ) && table.removeAttribute( 'style' );
				}

				// Insert the table element if we're creating one.
				if ( !this._.selectedElement )
				{
					editor.insertElement( table );
					// Override the default cursor position after insertElement to place
					// cursor inside the first cell (#7959), IE needs a while.
					setTimeout( function()
						{
							var firstCell = new CKEDITOR.dom.element( table.$.rows[ 0 ].cells[ 0 ] );
							var range = new CKEDITOR.dom.range( editor.document );
							range.moveToPosition( firstCell, CKEDITOR.POSITION_AFTER_START );
							range.select( 1 );
						}, 0 );
				}
				// Properly restore the selection, (#4822) but don't break
				// because of this, e.g. updated table caption.
				else
					try { selection.selectBookmarks( bms ); } catch( er ){}
			},
			onHide : function()
			{
				delete this._element;
			},
			contents : [
				{
					id : 'info',
					label : editor.lang.table.title,
					elements :
					[
						{
							type : 'hbox',
							widths : [ null, null ],
							styles : [ 'vertical-align:top' ],
							children :
							[
								{
									type : 'vbox',
									padding : 0,
									children :
									[
										{
											type : 'text',
											id : 'txtRows',
											'default' : 3,
											label : editor.lang.table.rows,
											required : true,
											controlStyle : 'width:5em',
											validate : validatorNum( editor.lang.table.invalidRows ),
											setup : function( selectedElement )
											{
												this.setValue( selectedElement.$.rows.length );
											},
											commit : commitValue
										},
										{
											type : 'text',
											id : 'txtCols',
											'default' : 2,
											label : editor.lang.table.columns,
											required : true,
											controlStyle : 'width:5em',
											validate : validatorNum( editor.lang.table.invalidCols ),
											setup : function( selectedTable )
											{
												this.setValue( tableColumns( selectedTable ) );
											},
											commit : commitValue
										},
										{
											type : 'html',
											html : '&nbsp;'
										},
										{
											type : 'select',
											id : 'selHeaders',
											'default' : '',
											label : editor.lang.table.headers,
											items :
											[
												[ editor.lang.table.headersNone, '' ],
												[ editor.lang.table.headersRow, 'row' ],
												[ editor.lang.table.headersColumn, 'col' ],
												[ editor.lang.table.headersBoth, 'both' ]
											],
											setup : function( selectedTable )
											{
												// Fill in the headers field.
												var dialog = this.getDialog();
												dialog.hasColumnHeaders = true;

												// Check if all the first cells in every row are TH
												for ( var row = 0 ; row < selectedTable.$.rows.length ; row++ )
												{
													// If just one cell isn't a TH then it isn't a header column
													var headCell = selectedTable.$.rows[row].cells[0];
													if ( headCell && headCell.nodeName.toLowerCase() != 'th' )
													{
														dialog.hasColumnHeaders = false;
														break;
													}
												}

												// Check if the table contains <thead>.
												if ( ( selectedTable.$.tHead !== null) )
													this.setValue( dialog.hasColumnHeaders ? 'both' : 'row' );
												else
													this.setValue( dialog.hasColumnHeaders ? 'col' : '' );
											},
											commit : commitValue
										},
										{
											type : 'text',
											id : 'txtBorder',
											'default' : 1,
											label : editor.lang.table.border,
											controlStyle : 'width:3em',
											validate : CKEDITOR.dialog.validate['number']( editor.lang.table.invalidBorder ),
											onChange : function()
											{
												var stBorderWidth = this.getDialog().getContentElement( 'advanced', 'borderWidth' ),
													stBorderStyle = this.getDialog().getContentElement( 'advanced', 'borderStyle' ),
													value = this.getValue();

												stBorderWidth.setValue( value );
												if ( stBorderStyle.getValue() == '' && value > 0 )
												{
													stBorderStyle.setValue( 'solid' );
												}
											},
											setup : function( selectedTable )
											{
												this.setValue( selectedTable.getAttribute( 'border' ) || '' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() )
													selectedTable.setAttribute( 'border', this.getValue() );
												else
													selectedTable.removeAttribute( 'border' );
											}
										},
										{
											id : 'cmbAlign',
											type : 'select',
											'default' : '',
											label : editor.lang.common.align,
											items :
											[
												[ editor.lang.common.notSet , ''],
												[ editor.lang.common.alignLeft , 'left'],
												[ editor.lang.common.alignCenter , 'center'],
												[ editor.lang.common.alignRight , 'right']
											],
											setup : function( selectedTable )
											{
												this.setValue( selectedTable.getAttribute( 'align' ) || '' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() )
													selectedTable.setAttribute( 'align', this.getValue() );
												else
													selectedTable.removeAttribute( 'align' );
											}
										}
									]
								},
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
													id : 'txtWidth',
													controlStyle : 'width:5em',
													label : editor.lang.common.width,
													title : editor.lang.common.cssLengthTooltip,
													'default' : '100%',
													getValue : defaultToPixel,
													validate : CKEDITOR.dialog.validate.cssLength( editor.lang.common.invalidCssLength.replace( '%1', editor.lang.common.width ) ),

													setup : function( selectedTable )
													{
														var val = selectedTable.getStyle( 'width' );
														val && this.setValue( val );
													},
													commit : function( data, selectedTable )
													{
														var width = this.getValue();
														width ? selectedTable.setStyle( 'width', width ) : selectedTable.removeStyle( 'width' );
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
													id : 'txtHeight',
													controlStyle : 'width:5em',
													label : editor.lang.common.height,
													title : editor.lang.common.cssLengthTooltip,
													'default' : '',
													getValue : defaultToPixel,
													validate : CKEDITOR.dialog.validate.cssLength( editor.lang.common.invalidCssLength.replace( '%1', editor.lang.common.height ) ),

													setup : function( selectedTable )
													{
														var val = selectedTable.getStyle( 'height' );
														val && this.setValue( val );
													},
													commit : function( data, selectedTable )
													{
														var height = this.getValue();
														height ? selectedTable.setStyle( 'height', height ) : selectedTable.removeStyle( 'height' );
													}
												}
											]
										},
										{
											type : 'html',
											html : '&nbsp;'
										},
										{
											id : 'cmbLayout',
											type : 'select',
											'default' : 'fixed',
											label : editor.lang.table.columnWidth,
											items :
											[
												[ editor.lang.table.fixed , 'fixed'],
												[ editor.lang.table.flexible , 'flexible']
											],
											setup : function( selectedTable )
											{
												this.setValue( selectedTable.getStyle( 'table-layout' ) == 'fixed' ? 'fixed' : 'flexible' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() == 'fixed' )
													selectedTable.setStyle( 'table-layout', 'fixed' );
												else
													selectedTable.removeStyle( 'table-layout' );
											}
										},
										{
											type : 'text',
											id : 'txtCellSpace',
											controlStyle : 'width:3em',
											label : editor.lang.table.cellSpace,
											'default' : 1,
											validate : CKEDITOR.dialog.validate.number( editor.lang.table.invalidCellSpacing ),
											setup : function( selectedTable )
											{
												this.setValue( selectedTable.getAttribute( 'cellSpacing' ) || '' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() )
													selectedTable.setAttribute( 'cellSpacing', this.getValue() );
												else
													selectedTable.removeAttribute( 'cellSpacing' );
											}
										},
										{
											type : 'text',
											id : 'txtCellPad',
											controlStyle : 'width:3em',
											label : editor.lang.table.cellPad,
											'default' : 1,
											validate : CKEDITOR.dialog.validate.number( editor.lang.table.invalidCellPadding ),
											setup : function( selectedTable )
											{
												this.setValue( selectedTable.getAttribute( 'cellPadding' ) || '' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() )
													selectedTable.setAttribute( 'cellPadding', this.getValue() );
												else
													selectedTable.removeAttribute( 'cellPadding' );
											}
										}
									]
								}
							]
						},
						{
							type : 'html',
							align : 'right',
							html : ''
						},
						{
							type : 'vbox',
							padding : 0,
							children :
							[
								{
									type : 'text',
									id : 'txtCaption',
									label : editor.lang.table.caption,
									setup : function( selectedTable )
									{
										this.enable();

										var nodeList = selectedTable.getElementsByTag( 'caption' );
										if ( nodeList.count() > 0 )
										{
											var caption = nodeList.getItem( 0 );
											var firstElementChild = caption.getFirst( CKEDITOR.dom.walker.nodeType( CKEDITOR.NODE_ELEMENT ) );

											if ( firstElementChild && !firstElementChild.equals( caption.getBogus() ) )
											{
												this.disable();
												this.setValue( caption.getText() );
												return;
											}

											caption = CKEDITOR.tools.trim( caption.getText() );
											this.setValue( caption );
										}
									},
									commit : function( data, table )
									{
										if ( !this.isEnabled() )
											return;

										var caption = this.getValue(),
											captionElement = table.getElementsByTag( 'caption' );
										if ( caption )
										{
											if ( captionElement.count() > 0 )
											{
												captionElement = captionElement.getItem( 0 );
												captionElement.setHtml( '' );
											}
											else
											{
												captionElement = new CKEDITOR.dom.element( 'caption', editor.document );
												if ( table.getChildCount() )
													captionElement.insertBefore( table.getFirst() );
												else
													captionElement.appendTo( table );
											}
											captionElement.append( new CKEDITOR.dom.text( caption, editor.document ) );
										}
										else if ( captionElement.count() > 0 )
										{
											for ( var i = captionElement.count() - 1 ; i >= 0 ; i-- )
												captionElement.getItem( i ).remove();
										}
									}
								},
								{
									type : 'text',
									id : 'txtSummary',
									label : editor.lang.table.summary,
									setup : function( selectedTable )
									{
										this.setValue( selectedTable.getAttribute( 'summary' ) || '' );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setAttribute( 'summary', this.getValue() );
										else
											selectedTable.removeAttribute( 'summary' );
									}
								}
							]
						}
					]
				},
				
				{
					id : 'advanced',
					label : editor.lang.common.advancedTab,
					accessKey : 'A',
					elements :
					[
						{
							id : 'cmbFrame',
							type : 'select',
							'default' : '',
							label : editor.lang.table.frame,
							items :
							[
								[ editor.lang.table.frameNoSides , ''],
								[ editor.lang.table.frameTop , 'above'],
								[ editor.lang.table.frameBottom , 'below'],
								[ editor.lang.table.frameTopBottom , 'hsides'],
								[ editor.lang.table.frameRightLeft , 'vsides'],
								[ editor.lang.table.frameLeftHand , 'lhs'],
								[ editor.lang.table.frameRightHand , 'rhs'],
								[ editor.lang.table.frameAll , 'box']
							],
							setup : function( selectedTable )
							{
								this.setValue( selectedTable.getAttribute( 'frame' ) || '' );
							},
							commit : function( data, selectedTable )
							{
								if ( this.getValue() )
									selectedTable.setAttribute( 'frame', this.getValue() );
								else
									selectedTable.removeAttribute( 'frame' );
							}
						},
						
						{
							id : 'cmbRules',
							type : 'select',
							'default' : '',
							label : editor.lang.table.rules,
							items :
							[
								[ editor.lang.table.rulesNo , ''],
								[ editor.lang.table.rulesGroups , 'groups'],
								[ editor.lang.table.rulesRows , 'rows'],
								[ editor.lang.table.rulesCols , 'cols'],
								[ editor.lang.table.rulesAll , 'all']
							],
							setup : function( selectedTable )
							{
								this.setValue( selectedTable.getAttribute( 'rules' ) || '' );
							},
							commit : function( data, selectedTable )
							{
								if ( this.getValue() )
									selectedTable.setAttribute( 'rules', this.getValue() );
								else
									selectedTable.removeAttribute( 'rules' );
							}
						},

						{
							type : 'hbox',
							widths : [ '30%', '40%', '30%' ],
							children :
							[
								{
									id : 'cmbStyle',
									type : 'select',
									'default' : '',
									label : editor.lang.common.styles,
									// Options are loaded dynamically.
									items :
									[
										[ editor.lang.common.notSet , '' ]
									],
									controlStyle : 'width:8em',
									onChange : function()
									{
										if ( this.getValue().length )
										{
											commitInternally.call( this,
												[
													'info:txtBorder',
													'info:cmbAlign',
													'info:txtWidth',
													'info:cmbWidthType',
													'info:txtHeight',
													'info:cmbLayout',
													'info:txtCellSpace',
													'info:txtCellPad',
													'info:txtSummary',
													'advanced:cmbFrame',
													'advanced:cmbRules',
													'advanced:txtGenClass',
													'advanced:txtId',
													'advanced:borderWidth',
													'advanced:borderStyle',
													'advanced:bgImage',
													'advanced:borderColor',
													'advanced:bgColor',
													'advanced:chkCollapsed'
												] );
										}
									},
									setup : function( selectedTable )
									{
										for ( var name in styles )
											styles[ name ].checkElementRemovable( selectedTable, true ) && this.setValue( name );
									},
									commit: function( data, selectedTable )
									{
										var styleName;
										if ( ( styleName = this.getValue() ) )
											styles[ styleName ].applyToObject( selectedTable );
									}
								},

								{
									type : 'text',
									id : 'txtGenClass',
									label : editor.lang.common.cssClasses,
									'default' : '',
									controlStyle : 'width:13em',
									setup : function( selectedTable )
									{
										this.setValue( selectedTable.getAttribute( 'class' ) );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setAttribute( 'class', this.getValue() );
										else
											selectedTable.removeAttribute( 'class' );
									}
								},
								{
									type : 'text',
									id : 'txtId',
									label : editor.lang.common.id,
									'default' : '',
									controlStyle : 'width:7em',
									setup : function( selectedTable )
									{
										this.setValue( selectedTable.getAttribute( 'id' ) );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setAttribute( 'id', this.getValue() );
										else
											selectedTable.removeAttribute( 'id' );
									}
								}
							]
						},
						{
							type : 'hbox',
							widths : [ '30%', '20%', '45%' ],
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
											label : editor.lang.table.borderWidth,
											'default' : '',
											setup : function( selectedTable )
											{
												var width = CKEDITOR.tools.normalizeCssValue( selectedTable, 'border-width' );
												this.setValue( width || '' );
											},
											commit : function( data, selectedTable )
											{
												if ( this.getValue() )
													selectedTable.setStyle( 'border-width', this.getValue() + 'px' );
												else
													selectedTable.removeStyle( 'border-width' );
											}
										},
										{
											type : 'html',
											html : '<br />' + editor.lang.table.widthPx
										}
									]
								},
								{
									type : 'select',
									id : 'borderStyle',
									label : editor.lang.table.borderStyle,
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
									setup : function( selectedTable )
									{
										var style = CKEDITOR.tools.normalizeCssValue( selectedTable, 'border-style' );
										this.setValue( style || '' );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setStyle( 'border-style', this.getValue() );
										else
											selectedTable.removeStyle( 'border-style' );
									}
								},
								{
									type : 'text',
									id : 'bgImage',
									label : editor.lang.table.bgImage,
									'default' : '',
									setup : function( selectedTable )
									{
										var image = CKEDITOR.tools.normalizeCssValue( selectedTable, 'background-image' );
										this.setValue( image || '' );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setStyle( 'background-image', "url('" + this.getValue() + "')" );
										else
											selectedTable.removeStyle( 'background-image' );
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
									label : editor.lang.table.cell.borderColor,
									'default' : '',
									setup : function( selectedTable )
									{
										var color = CKEDITOR.tools.normalizeCssValue( selectedTable, 'border-color' );
										this.setValue( color || '' );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setStyle( 'border-color', CKEDITOR.tools.convertHexToRgb( this.getValue() ) );
										else
											selectedTable.removeStyle( 'border-color' );
									}
								},
								{
									type : 'button',
									id : 'borderColorChoose',
									"class" : 'colorChooser',
									label : editor.lang.table.cell.chooseColor,
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
									label : editor.lang.table.cell.bgColor,
									'default' : '',
									setup : function( selectedTable )
									{
										var color = CKEDITOR.tools.normalizeCssValue( selectedTable, 'background-color' );
										this.setValue( color || '' );
									},
									commit : function( data, selectedTable )
									{
										if ( this.getValue() )
											selectedTable.setStyle( 'background-color', CKEDITOR.tools.convertHexToRgb( this.getValue() ) );
										else
											selectedTable.removeStyle( 'background-color' );
									}
								},
								{
									type : 'button',
									id : 'bgColorChoose',
									"class" : 'colorChooser',
									label : editor.lang.table.cell.chooseColor,
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
						},
						{
							type : 'checkbox',
							id : 'chkCollapsed',
							label : editor.lang.table.collapsed,
							setup : function( selectedTable )
							{
								this.setValue( selectedTable.getStyle( 'border-collapse' ) == 'collapse' );
							},
							commit : function( data, selectedTable )
							{
								if ( this.getValue() )
									selectedTable.setStyle( 'border-collapse', 'collapse' );
								else
									selectedTable.removeStyle( 'border-collapse' );
							}
						}
					]
				}
			]
		};
	}

	CKEDITOR.dialog.add( 'table', function( editor )
		{
			return tableDialog( editor, 'table' );
		} );
	CKEDITOR.dialog.add( 'tableProperties', function( editor )
		{
			return tableDialog( editor, 'tableProperties' );
		} );
})();
