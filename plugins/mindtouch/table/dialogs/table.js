/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

(function() {
	var defaultToPixel = CKEDITOR.tools.cssLength;

	var commitValue = function( data ) {
			var id = this.id;
			if ( !data.info )
				data.info = {};
			data.info[ id ] = this.getValue();
		};

	CKEDITOR.dialog.add( 'mindtouchTableProperties', function( editor ) {
		var editable = editor.editable();

		// Synchronous field values to other impacted fields is required, e.g. div styles
		// change should also alter inline-style text.
		function commitInternally( targetFields ) {
			var dialog = this.getDialog(),
				element = dialog._.selectedElement && dialog._.selectedElement.clone();

			if ( element ) {
				// Commit this field and broadcast to target fields.
				var data = {};
				this.commit( data, element, true );

				targetFields = [].concat( targetFields );
				var length = targetFields.length,
					field;
				for ( var i = 0; i < length; i++ ) {
					field = dialog.getContentElement.apply( dialog, targetFields[ i ].split( ':' ) );
					field && field.setup && field.setup( element );
				}
			}
		}

		// Registered 'CKEDITOR.style' instances.
		var styles = {};

		return {
			title: editor.lang.table.title,
			minWidth: 360,
			minHeight: CKEDITOR.env.ie ? 210 : 180,

			onLoad: function() {
				// Preparing for the 'elementStyle' field.
				var dialog = this,
					stylesField = this.getContentElement( 'info', 'elementStyle' );

				// Reuse the 'stylescombo' plugin's styles definition.
				editor.getStylesSet( function( stylesDefinitions ) {
					var styleName, style;

					if ( stylesDefinitions ) {
						// Digg only those styles that apply to 'div'.
						for ( var i = 0; i < stylesDefinitions.length; i++ ) {
							var styleDefinition = stylesDefinitions[ i ];
							if ( styleDefinition.element && styleDefinition.element == 'table' ) {
								styleName = styleDefinition.name;
								styles[ styleName ] = style = new CKEDITOR.style( styleDefinition );

								if ( editor.filter.check( style ) ) {
									// Populate the styles field options with style name.
									stylesField.items.push( [ styleName, styleName ] );
									stylesField.add( styleName, styleName );
								}
							}
						}
					}

					// We should disable the content element
					// it if no options are available at all.
					stylesField[ stylesField.items.length > 1 ? 'enable' : 'disable' ]();

					// Now setup the field value manually if dialog was opened on element. (#9689)
					setTimeout( function() {
						dialog._.selectedElement && stylesField.setup( dialog._.selectedElement );
					}, 0 );
				});
			},

			onShow: function() {
				// Detect if there's a selected table.
				var selection = editor.getSelection(),
					ranges = selection.getRanges(),
					selected = selection.getSelectedElement(),
					table;

				if ( selected && selected.is( 'table' ) ) {
					table = selected;
				} else if ( ranges.length > 0 ) {
					// Webkit could report the following range on cell selection (#4948):
					// <table><tr><td>[&nbsp;</td></tr></table>]
					if ( CKEDITOR.env.webkit )
						ranges[ 0 ].shrink( CKEDITOR.NODE_ELEMENT );

					table = editor.elementPath( ranges[ 0 ].getCommonAncestor( true ) ).contains( 'table', 1 );
				}

				// Save a reference to the selected table, and push a new set of default values.
				this._.selectedElement = table;

				if ( table ) {
					this.setupContent( table );
				} else {
					// @todo: disable dialog
				}
			},
			onOk: function() {
				var selection = editor.getSelection(),
					bms = this._.selectedElement && selection.createBookmarks(),
					table = this._.selectedElement,
					me = this,
					data = {};

				table && this.commitContent( data, table );

				if ( data.info ) {
					var info = data.info;

					// Modify the table headers. Depends on having rows and cols generated
					// correctly so it can't be done in commit functions.

					var headers = '';
					if ( info.chkFirstRow ) {
						headers = 'row';
					}
					if ( info.chkFirstColumn ) {
						headers = headers.length ? 'both' : 'col';
					}

					// Should we make a <thead>?
					if ( !table.$.tHead && ( headers == 'row' || headers == 'both' ) ) {
						var thead = new CKEDITOR.dom.element( table.$.createTHead() );
						tbody = table.getElementsByTag( 'tbody' ).getItem( 0 );
						var theRow = tbody.getElementsByTag( 'tr' ).getItem( 0 );

						// Change TD to TH:
						for ( i = 0; i < theRow.getChildCount(); i++ ) {
							var th = theRow.getChild( i );
							// Skip bookmark nodes. (#6155)
							if ( th.type == CKEDITOR.NODE_ELEMENT && !th.data( 'cke-bookmark' ) ) {
								th.renameNode( 'th' );
								th.setAttribute( 'scope', 'col' );
							}
						}
						thead.append( theRow.remove() );
					}

					if ( table.$.tHead !== null && !( headers == 'row' || headers == 'both' ) ) {
						// Move the row out of the THead and put it in the TBody:
						thead = new CKEDITOR.dom.element( table.$.tHead );
						tbody = table.getElementsByTag( 'tbody' ).getItem( 0 );

						var previousFirstRow = tbody.getFirst();
						while ( thead.getChildCount() > 0 ) {
							theRow = thead.getFirst();
							for ( i = 0; i < theRow.getChildCount(); i++ ) {
								var newCell = theRow.getChild( i );
								if ( newCell.type == CKEDITOR.NODE_ELEMENT ) {
									newCell.renameNode( 'td' );
									newCell.removeAttribute( 'scope' );
								}
							}
							theRow.insertBefore( previousFirstRow );
						}
						thead.remove();
					}

					// Should we make all first cells in a row TH?
					if ( !this.hasColumnHeaders && ( headers == 'col' || headers == 'both' ) ) {
						for ( row = 0; row < table.$.rows.length; row++ ) {
							newCell = new CKEDITOR.dom.element( table.$.rows[ row ].cells[ 0 ] );
							newCell.renameNode( 'th' );
							newCell.setAttribute( 'scope', 'row' );
						}
					}

					// Should we make all first TH-cells in a row make TD? If 'yes' we do it the other way round :-)
					if ( ( this.hasColumnHeaders ) && !( headers == 'col' || headers == 'both' ) ) {
						for ( i = 0; i < table.$.rows.length; i++ ) {
							row = new CKEDITOR.dom.element( table.$.rows[ i ] );
							if ( row.getParent().getName() == 'tbody' ) {
								newCell = new CKEDITOR.dom.element( row.$.cells[ 0 ] );
								newCell.renameNode( 'td' );
								newCell.removeAttribute( 'scope' );
							}
						}
					}

					if ( !table.getAttribute( 'style' ) ) {
						table.removeAttribute( 'style' );
					}
				}

				// Properly restore the selection, (#4822) but don't break
				// because of this, e.g. updated table caption.
				try {
					bms && selection.selectBookmarks( bms );
				} catch ( er ) {}
			},
			contents: [
				{
					id: 'info',
					label: editor.lang.table.title,
					elements: [
						{
							type: 'hbox',
							widths: [ null, null, null, null ],
							styles: [ 'vertical-align:top' ],
							children: [
								{
									type: 'vbox',
									padding: 0,
									children: [
										{
											type: 'html',
											html: editor.lang[ 'mindtouch/table' ].headings
										},
										{
											type: 'checkbox',
											id: 'chkFirstRow',
											requiredContent: 'th',
											label: editor.lang.table.headersRow,
											setup: function( selectedTable ) {
												// Check if the table contains <thead>.
												this.setValue( selectedTable.$.tHead !== null );
											},
											commit: commitValue
										},
										{
											type: 'checkbox',
											id: 'chkFirstColumn',
											requiredContent: 'th',
											label: editor.lang.table.headersColumn,
											setup: function( selectedTable ) {
												// Fill in the headers field.
												var dialog = this.getDialog();
												dialog.hasColumnHeaders = true;

												// Check if all the first cells in every row are TH
												for ( var row = 0; row < selectedTable.$.rows.length; row++ ) {
													// If just one cell isn't a TH then it isn't a header column
													var headCell = selectedTable.$.rows[ row ].cells[ 0 ];
													if ( headCell && headCell.nodeName.toLowerCase() != 'th' ) {
														dialog.hasColumnHeaders = false;
														break;
													}
												}

												this.setValue( dialog.hasColumnHeaders );
											},
											commit: commitValue
										}
									]
								},
								{
									type: 'text',
									id: 'txtWidth',
									requiredContent: 'table{width}',
									controlStyle: 'width:5em',
									label: editor.lang.common.width,
									title: editor.lang.common.cssLengthTooltip,
									'default': editor.filter.check( 'table{width}' ) ? '100%' : 0,
									getValue: defaultToPixel,
									validate: CKEDITOR.dialog.validate.cssLength( editor.lang.common.invalidCssLength.replace( '%1', editor.lang.common.width ) ),
									setup: function( selectedTable ) {
										var val = selectedTable.getStyle( 'width' );
										this.setValue( val );
									},
									commit: function( data, selectedTable ) {
										if ( this.getValue() ) {
											selectedTable.setStyle( 'width', this.getValue() )
										} else {
											selectedTable.removeStyle( 'width' );
										}
									}
								},
								{
									type: 'text',
									id: 'txtBorder',
									requiredContent: 'table[border]',
									// Avoid setting border which will then disappear.
									'default': editor.filter.check( 'table[border]' ) ? 1 : 0,
									label: editor.lang.table.border,
									controlStyle: 'width:3em',
									validate: CKEDITOR.dialog.validate[ 'number' ]( editor.lang.table.invalidBorder ),
									setup: function( selectedTable ) {
										this.setValue( selectedTable.getAttribute( 'border' ) || '' );
									},
									commit: function( data, selectedTable ) {
										if ( this.getValue() ) {
											selectedTable.setAttribute( 'border', this.getValue() );
										} else {
											selectedTable.removeAttribute( 'border' );
										}
									}
								},
								{
									type: 'text',
									id: 'txtCellPad',
									requiredContent: 'table[cellpadding]',
									controlStyle: 'width:3em',
									label: editor.lang.table.cellPad,
									'default': editor.filter.check( 'table[cellpadding]' ) ? 1 : 0,
									validate: CKEDITOR.dialog.validate.number( editor.lang.table.invalidCellPadding ),
									setup: function( selectedTable ) {
										this.setValue( selectedTable.getAttribute( 'cellPadding' ) || '' );
									},
									commit: function( data, selectedTable ) {
										if ( this.getValue() ) {
											selectedTable.setAttribute( 'cellPadding', this.getValue() );
										} else {
											selectedTable.removeAttribute( 'cellPadding' );
										}
									}
								}
							]
						},
						{
							type: 'hbox',
							widths: [ '30%', '70%' ],
							children: [
								{
									id: 'elementStyle',
									type: 'select',
									style: 'width: 100%;',
									label: editor.lang[ 'mindtouch/table' ].styleSelectLabel,
									'default': '',
									// Options are loaded dynamically.
									items: [
										[ editor.lang.common.notSet, '' ]
									],
									onChange: function() {
										commitInternally.call( this, [ 'info:elementStyle', 'info:class', 'info:txtWidth', 'info:txtBorder', 'info:txtCellPad' ] );
									},
									setup: function( selectedTable ) {
										for ( var name in styles ) {
											styles[ name ].checkElementRemovable( selectedTable, true ) && this.setValue( name, 1 );
										}
									},
									commit: function( data, selectedTable, internal ) {
										var styleName;
										if ( ( styleName = this.getValue() ) ) {
											var style = styles[ styleName ];
											style.applyToObject( selectedTable );
										} else {
											for ( var name in styles ) {
												var style = styles[ name ];
												
												if ( internal ) {
													var def = style.getDefinition();
													def.ignoreReadonly = true;
													def.alwaysRemoveElement = true;
													style = new CKEDITOR.style( def );
												}

												if ( style.checkElementRemovable( selectedTable, true ) ) {
													if ( internal ) {
														style.removeFromObject( selectedTable );
													} else {
														style.remove( selectedTable.getDocument() );
													}
													break;
												}
											}
										}
									}
								},
								{
									id: 'class',
									type: 'text',
									requiredContent: 'table(cke-xyz)', // Random text like 'xyz' will check if all are allowed.
									label: editor.lang.common.cssClass,
									'default': '',
									setup: function( selectedTable ) {
										this.setValue( selectedTable.getAttribute( 'class' ) || '' );
									},
									commit: function( data, selectedTable ) {
										if ( this.getValue() ) {
											selectedTable.setAttribute( 'class', this.getValue() );
										} else {
											selectedTable.removeAttribute( 'class' );
										}
									}
								}
							]
						},
						{
							type: 'text',
							id: 'txtCaption',
							requiredContent: 'caption',
							label: editor.lang.table.caption,
							setup: function( selectedTable ) {
								this.enable();

								var nodeList = selectedTable.getElementsByTag( 'caption' );
								if ( nodeList.count() > 0 ) {
									var caption = nodeList.getItem( 0 );
									var firstElementChild = caption.getFirst( CKEDITOR.dom.walker.nodeType( CKEDITOR.NODE_ELEMENT ) );

									if ( firstElementChild && !firstElementChild.equals( caption.getBogus() ) ) {
										this.disable();
										this.setValue( caption.getText() );
										return;
									}

									caption = CKEDITOR.tools.trim( caption.getText() );
									this.setValue( caption );
								}
							},
							commit: function( data, table ) {
								if ( !this.isEnabled() )
									return;

								var caption = this.getValue(),
									captionElement = table.getElementsByTag( 'caption' );
								if ( caption ) {
									if ( captionElement.count() > 0 ) {
										captionElement = captionElement.getItem( 0 );
										captionElement.setHtml( '' );
									} else {
										captionElement = new CKEDITOR.dom.element( 'caption', editor.document );
										if ( table.getChildCount() )
											captionElement.insertBefore( table.getFirst() );
										else
											captionElement.appendTo( table );
									}
									captionElement.append( new CKEDITOR.dom.text( caption, editor.document ) );
								} else if ( captionElement.count() > 0 ) {
									for ( var i = captionElement.count() - 1; i >= 0; i-- )
										captionElement.getItem( i ).remove();
								}
							}
						},
						{
							type: 'text',
							id: 'txtSummary',
							requiredContent: 'table[summary]',
							label: editor.lang.table.summary,
							setup: function( selectedTable ) {
								this.setValue( selectedTable.getAttribute( 'summary' ) || '' );
							},
							commit: function( data, selectedTable ) {
								if ( this.getValue() ) {
									selectedTable.setAttribute( 'summary', this.getValue() );
								} else {
									selectedTable.removeAttribute( 'summary' );
								}
							}
						}
					]
				}
			]
		};
	});
})();
