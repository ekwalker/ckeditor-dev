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
 * Support of wrap styles
 * @see #MT-9346
 * @link {http://developer.mindtouch.com/User:dev/Specs/Wrapping_block_styles_for_the_editor}
 * @fileOverview The "wrapstyle" plugin. It wraps the selected block level elements with a 'div' element with specified style.
 */

(function() {
	// Definition of elements at which div operation should stopped.
	var divLimitDefinition = { body:1 };

	// DTD of 'div' element
	var dtd = CKEDITOR.dtd.div;

	// Add to collection with DUP examination.
	// @param {Object} collection
	// @param {Object} element
	// @param {Object} database
	function addSafely( collection, element, database ) {
		// 1. IE doesn't support customData on text nodes;
		// 2. Text nodes never get chance to appear twice;
		if ( !element.is || !element.getCustomData( 'block_processed' ) ) {
			element.is && CKEDITOR.dom.element.setMarker( database, element, 'block_processed', true );
			collection.push( element );
		}
	}

	// Get the first div limit element on the element's path.
	// @param {Object} element
	function getDivContainer( element ) {
		var container = new CKEDITOR.dom.elementPath( element ).blockLimit;

		// Dont stop at 'td' and 'th'
		if ( container.is( [ 'td', 'th' ] ) ) {
			var parentPath = new CKEDITOR.dom.elementPath( container.getParent() );
			container = parentPath.blockLimit;
		}

		return container;
	}

	// Divide a set of nodes to different groups by their path's blocklimit element.
	// Note: the specified nodes should be in source order naturally, which mean they are supposed to producea by following class:
	//  * CKEDITOR.dom.range.Iterator
	//  * CKEDITOR.dom.domWalker
	// @returns {Array[]} the grouped nodes
	function groupByDivLimit( nodes ) {
		var groups = [],
			lastDivLimit = null,
			path, block;
		for ( var i = 0; i < nodes.length; i++ ) {
			block = nodes[ i ];
			var limit = getDivContainer( block );
			if ( !limit.equals( lastDivLimit ) ) {
				lastDivLimit = limit;
				groups.push( [] );
			}
			groups[ groups.length - 1 ].push( block );
		}
		return groups;
	}

	// Wrapping 'div' element around appropriate blocks among the selected ranges.
	// @param {Object} editor
	function createDiv( editor ) {
		// new adding containers OR detected pre-existed containers.
		var containers = [];
		// node markers store.
		var database = {};
		// All block level elements which contained by the ranges.
		var containedBlocks = [],
			block;

		// Get all ranges from the selection.
		var selection = editor.getSelection(),
			ranges = selection.getRanges();
		var bookmarks = selection.createBookmarks();
		var i, iterator;

		// Calcualte a default block tag if we need to create blocks.
		var blockTag = editor.config.enterMode == CKEDITOR.ENTER_DIV ? 'div' : 'p';

		// collect all included elements from dom-iterator
		for ( i = 0; i < ranges.length; i++ ) {
			iterator = ranges[ i ].createIterator();
			while ( ( block = iterator.getNextParagraph() ) ) {
				// include contents of blockLimit elements.
				if ( block.getName() in divLimitDefinition ) {
					var j,
						childNodes = block.getChildren();
					for ( j = 0; j < childNodes.count(); j++ ) {
						addSafely( containedBlocks, childNodes.getItem( j ), database );
					}
				} else {
					// Bypass dtd disallowed elements.
					while ( !dtd[ block.getName() ] && !block.equals( ranges[ i ].root ) ) {
						block = block.getParent();
					}
					addSafely( containedBlocks, block, database );
				}
			}
		}

		CKEDITOR.dom.element.clearAllMarkers( database );

		var blockGroups = groupByDivLimit( containedBlocks );
		var ancestor, blockEl, divElement;

		for ( i = 0; i < blockGroups.length; i++ ) {
			var currentNode = blockGroups[ i ][ 0 ];

			// Calculate the common parent node of all contained elements.
			ancestor = currentNode.getParent();
			for ( j = 1; j < blockGroups[ i ].length; j++ ) {
				ancestor = ancestor.getCommonAncestor( blockGroups[ i ][ j ] );
			}

			divElement = new CKEDITOR.dom.element( 'div', editor.document );

			// Normalize the blocks in each group to a common parent.
			for ( j = 0; j < blockGroups[ i ].length; j++ ) {
				currentNode = blockGroups[ i ][ j ];

				while ( !currentNode.getParent().equals( ancestor ) ) {
					currentNode = currentNode.getParent();
				}

				// This could introduce some duplicated elements in array.
				blockGroups[ i ][ j ] = currentNode;
			}

			// Wrapped blocks counting
			var fixedBlock = null;
			for ( j = 0; j < blockGroups[ i ].length; j++ ) {
				currentNode = blockGroups[ i ][ j ];

				// Avoid DUP elements introduced by grouping.
				if ( !( currentNode.getCustomData && currentNode.getCustomData( 'block_processed' ) ) ) {
					currentNode.is && CKEDITOR.dom.element.setMarker( database, currentNode, 'block_processed', true );

					// Establish new container, wrapping all elements in this group.
					if ( !j ) {
						divElement.insertBefore( currentNode );
					}

					divElement.append( currentNode );
				}
			}

			CKEDITOR.dom.element.clearAllMarkers( database );
			containers.push( divElement );
		}

		selection.selectBookmarks( bookmarks );
		return containers;
	}

	CKEDITOR.plugins.add( 'mindtouch/stylewrap', {
		beforeInit: function( editor ) {
			var applyWrapStyle = function( style ) {
				var def = style.getDefinition();
				if ( def.wrap === true && style.type == CKEDITOR.STYLE_BLOCK ) {
					editor.execCommand( 'wrapstyle', style );
					return true;
				}
				return false;
			};

			// extend style class
			var editorProto = CKEDITOR.editor.prototype,
				styleProto = CKEDITOR.style.prototype;

			editorProto.applyStyle = CKEDITOR.tools.override( editorProto.applyStyle, function( applyStyleFn ) {
				return function ( style ) {
					if ( !applyWrapStyle( style ) ) {
						applyStyleFn.call( this, style );
					}
				};
			});

			editorProto.removeStyle = CKEDITOR.tools.override( editorProto.removeStyle, function( removeStyleFn ) {
				return function ( style ) {
					if ( !applyWrapStyle( style ) ) {
						removeStyleFn.call( this, style );
					}
				};
			});

			styleProto.apply = CKEDITOR.tools.override( styleProto.apply, function( applyFn ) {
				return function( document ) {
					if ( !applyWrapStyle( this ) ) {
						applyFn.call( this, document );
					}
				};
			});

			styleProto.remove = CKEDITOR.tools.override( styleProto.remove, function( removeFn ) {
				return function( document ) {
					if ( !applyWrapStyle( this ) ) {
						removeFn.call( this, document );
					}
				};
			});

			styleProto.checkElementRemovable = CKEDITOR.tools.override( styleProto.checkElementRemovable, function( checkElementRemovableFn ) {
				return function( element, fullMatch ) {
					var def = this.getDefinition();
					if ( def.wrap === true && this.type == CKEDITOR.STYLE_BLOCK ) {
						if ( element && element.hasAscendant( this.element, true ) ) {
							element = element && element.getAscendant( this.element, true );
						}
					}

					return checkElementRemovableFn.apply( this, [ element, fullMatch ] );
				};
			});
		},

		init: function( editor ) {
			editor.addCommand( 'wrapstyle', {
				exec: function( editor, style ) {
					var selection = editor.getSelection(),
						bookmarks = selection && selection.createBookmarks(),
						ranges = selection && selection.getRanges(),
						rangeIterator = ranges && ranges.createIterator(),
						range,
						iterator,
						div,
						removeDiv = true,
						toApply = [],
						toRemove = [];

					while ( ( range = rangeIterator.getNextRange() ) ) {
						iterator = range.createIterator();

						var block;
						while ( ( block = iterator.getNextParagraph() ) ) {
							div = block.getAscendant( style.element, true );

							if ( div && style.checkElementRemovable( div, true ) ) {
								var prev = toRemove.pop(),
									commonAncestor = prev && prev.getCommonAncestor( div );

								if ( commonAncestor && style.checkElementRemovable( commonAncestor, true ) ) {
									toRemove.push( commonAncestor )
								} else {
									prev && toRemove.push( prev );
									toRemove.push( div );
								}
							} else if ( div && div.hasClass( editor.config.style_wrap_class ) ) {
								toApply.push( div );
								removeDiv = false;
							} else if ( toRemove.length == 0 ) {
								removeDiv = false;
							}
						}
					}

					if ( removeDiv ) {
						for ( var i = 0, count = toRemove.length; i < count; i++ ) {
							toRemove[ i ].remove( true );
						}
					} else {
						var divs = toApply.length ? toApply : createDiv( editor );

						// createDiv fires selection change event
						// but style is not applied at this point yet
						// and next selection change events are not fired because path is not changed
						// so we need force selection check
						editor.forceNextSelectionCheck();

						for ( var i = 0, count = divs.length; i < count; i++ ) {
							div = divs[ i ];
							style.applyToObject( div );
						}
					}

					bookmarks && selection.selectBookmarks( bookmarks );
				}
			});
		},

		afterInit: function(editor ) {
			var wrapStyles = [];

			editor.on( 'stylesSet', function( ev ) {
				var styles = ev.data.styles;
				for ( var i = 0, count = styles.length; i < count; i++ ) {
					var styleDefinition = styles[ i ],
						style, wrapClass, className, re;

					// add the common class name for all wrap styles
					if ( styleDefinition.wrap && styleDefinition.wrap === true && styleDefinition.attributes ) {
						className = styleDefinition.attributes[ 'class' ] || '';

						wrapClass = editor.config.style_wrap_class;
						re = new RegExp( '(^|\\s)' + wrapClass + '(\\s|$)', 'i' );

						if ( !re.test( className ) ) {
							if ( className.length ) {
								className += ' ';
							}

							className += wrapClass;
						}

						styleDefinition.attributes[ 'class' ] = className;

						style = new CKEDITOR.style( styleDefinition );
						wrapStyles.push( style );
					}
				}
			});

			// Don't remove formatting from wrap divs
			editor.addRemoveFormatFilter && editor.addRemoveFormatFilter( function( element ) {
				for ( var i = 0, count = wrapStyles.length; i < count; i++ ) {
					var style = wrapStyles[ i ];

					if ( element.is( style.element ) && style.checkElementRemovable( element ) ) {
						return false;
					}
				}

				return true;
			});
		}
	});
})();

/**
 * The common class for wrap blocks.
 * @name CKEDITOR.config.style_wrap_class
 * @type String
 * @default 'style-wrap'
 */
CKEDITOR.config.style_wrap_class = 'style-wrap';
