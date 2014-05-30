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
 * @file Definition List plugin.
 */

(function() {
	var listNodeNames = {dl: 1};

	var whitespaces = CKEDITOR.dom.walker.whitespaces(),
		bookmarks = CKEDITOR.dom.walker.bookmark(),
		nonEmpty = function(node) {
			return !(whitespaces(node) || bookmarks(node));
		},
		blockBogus = CKEDITOR.dom.walker.bogus();

	function cleanUpDirection(element) {
		var dir, parent, parentDir;
		if ((dir = element.getDirection())) {
			parent = element.getParent();
			while (parent && !(parentDir = parent.getDirection())) {
				parent = parent.getParent();
			}

			if (dir == parentDir) {
				element.removeAttribute('dir');
			}
		}
	}

	// Inheirt inline styles from another element.

	function inheirtInlineStyles(parent, el) {
		var style = parent.getAttribute('style');

		// Put parent styles before child styles.
		style && el.setAttribute('style', style.replace(/([^;])$/, '$1;') + (el.getAttribute('style') || ''));
	}

	CKEDITOR.plugins.definitionList = {
		/*
		 * Convert a DOM list tree into a data structure that is easier to
		 * manipulate. This operation should be non-intrusive in the sense that it
		 * does not change the DOM tree, with the exception that it may add some
		 * markers to the list item nodes when database is specified.
		 */
		listToArray: function(listNode, database, baseArray, baseIndentLevel, grandparentNode) {
			if (!listNodeNames[listNode.getName()]) {
				return [];
			}

			if (!baseIndentLevel) {
				baseIndentLevel = 0;
			}

			if (!baseArray) {
				baseArray = [];
			}

			// Iterate over all list items to and look for inner lists.
			for (var i = 0, count = listNode.getChildCount(); i < count; i++) {
				var listItem = listNode.getChild(i);

				// Fixing malformed nested lists by moving it into a previous list item. (#6236)
				if (listItem.type == CKEDITOR.NODE_ELEMENT && listItem.getName() in CKEDITOR.dtd.$list) {
					CKEDITOR.plugins.definitionList.listToArray(listItem, database, baseArray, baseIndentLevel + 1);
				}

				// It may be a text node or some funny stuff.
				if (!listItem.is || !listItem.is('dt', 'dd')) {
					continue;
				}

				var itemObj = {
					'parent': listNode,
					indent: baseIndentLevel,
					element: listItem,
					contents: []
				};
				if (!grandparentNode) {
					itemObj.grandparent = listNode.getParent();
					if (itemObj.grandparent && itemObj.grandparent.is && itemObj.grandparent.is('dt', 'dd')) {
						itemObj.grandparent = itemObj.grandparent.getParent();
					}
				} else {
					itemObj.grandparent = grandparentNode;
				}

				if (database) {
					CKEDITOR.dom.element.setMarker(database, listItem, 'listarray_index', baseArray.length);
				}
				baseArray.push(itemObj);

				for (var j = 0, itemChildCount = listItem.getChildCount(), child; j < itemChildCount; j++) {
					child = listItem.getChild(j);
					if (child.type == CKEDITOR.NODE_ELEMENT && listNodeNames[child.getName()]) {
						// Note the recursion here, it pushes inner list items with
						// +1 indentation in the correct order.
						CKEDITOR.plugins.definitionList.listToArray(child, database, baseArray, baseIndentLevel + 1, itemObj.grandparent);
					} else {
						itemObj.contents.push(child);
					}
				}
			}
			return baseArray;
		},

		// Convert our internal representation of a list back to a DOM forest.
		arrayToList: function(listArray, database, baseIndex, paragraphMode, dir) {
			if (!baseIndex) {
				baseIndex = 0;
			}
			if (!listArray || listArray.length < baseIndex + 1) {
				return null;
			}
			var i,
				doc = listArray[baseIndex].parent.getDocument(),
				retval = new CKEDITOR.dom.documentFragment(doc),
				rootNode = null,
				currentIndex = baseIndex,
				indentLevel = Math.max(listArray[baseIndex].indent, 0),
				currentListItem = null,
				orgDir,
				block,
				paragraphName = (paragraphMode == CKEDITOR.ENTER_P ? 'p' : 'div');
			while (1) {
				var item = listArray[currentIndex],
					itemGrandParent = item.grandparent;

				orgDir = item.element.getDirection(1);

				if (item.indent == indentLevel) {
					if (!rootNode || listArray[currentIndex].parent.getName() != rootNode.getName()) {
						rootNode = listArray[currentIndex].parent.clone(false, 1);
						dir && rootNode.setAttribute('dir', dir);
						retval.append(rootNode);
					}
					currentListItem = rootNode.append(item.element.clone(0, 1));

					if (orgDir != rootNode.getDirection(1)) {
						currentListItem.setAttribute('dir', orgDir);
					}

					for (i = 0; i < item.contents.length; i++) {
						currentListItem.append(item.contents[i].clone(1, 1));
					}
					currentIndex++;
				} else if (item.indent == Math.max(indentLevel, 0) + 1) {
					// Maintain original direction (#6861).
					var currDir = listArray[currentIndex - 1].element.getDirection(1),
						listData = CKEDITOR.plugins.definitionList.arrayToList(listArray, null, currentIndex, paragraphMode, currDir != orgDir ? orgDir : null);

					// If the next block is an <li> with another list tree as the first
					// child, we'll need to append a filler (<br>/NBSP) or the list item
					// wouldn't be editable. (#6724)
					if (!currentListItem.getChildCount() && CKEDITOR.env.ie && !(doc.$.documentMode > 7)) {
						currentListItem.append(doc.createText('\xa0'));
					}
					currentListItem.append(listData.listNode);
					currentIndex = listData.nextIndex;
				} else if (item.indent == -1 && !baseIndex && itemGrandParent) {
					if (listNodeNames[itemGrandParent.getName()]) {
						currentListItem = item.element.clone(false, true);
						if (orgDir != itemGrandParent.getDirection(1)) {
							currentListItem.setAttribute('dir', orgDir);
						}
					} else {
						currentListItem = new CKEDITOR.dom.documentFragment(doc);
					}

					// Migrate all children to the new container,
					// apply the proper text direction.
					var dirLoose = itemGrandParent.getDirection(1) != orgDir,
						li = item.element,
						className = li.getAttribute('class'),
						style = li.getAttribute('style');

					var needsBlock = currentListItem.type == CKEDITOR.NODE_DOCUMENT_FRAGMENT && (paragraphMode != CKEDITOR.ENTER_BR || dirLoose || style || className);

					var child, count = item.contents.length;
					for (i = 0; i < count; i++) {
						child = item.contents[i];

						if (child.type == CKEDITOR.NODE_ELEMENT && child.isBlockBoundary()) {
							// Apply direction on content blocks.
							if (dirLoose && !child.getDirection()) {
								child.setAttribute('dir', orgDir);
							}

							inheirtInlineStyles(li, child);

							className && child.addClass(className);
						} else if (needsBlock) {
							// Establish new block to hold text direction and styles.
							if (!block) {
								block = doc.createElement(paragraphName);
								dirLoose && block.setAttribute('dir', orgDir);
							}

							// Copy over styles to new block;
							style && block.setAttribute('style', style);
							className && block.setAttribute('class', className);

							block.append(child.clone(1, 1));
						}

						currentListItem.append(block || child.clone(1, 1));
					}

					if (currentListItem.type == CKEDITOR.NODE_DOCUMENT_FRAGMENT && currentIndex != listArray.length - 1) {
						var last = currentListItem.getLast();
						if (last && last.type == CKEDITOR.NODE_ELEMENT && last.getAttribute('type') == '_moz') {
							last.remove();
						}

						if (!(last = currentListItem.getLast(nonEmpty) && last.type == CKEDITOR.NODE_ELEMENT && last.getName() in CKEDITOR.dtd.$block)) {
							currentListItem.append(doc.createElement('br'));
						}
					}

					var currentListItemName = currentListItem.$.nodeName.toLowerCase();
					if (!CKEDITOR.env.ie && (currentListItemName == 'div' || currentListItemName == 'p')) {
						currentListItem.appendBogus();
					}
					retval.append(currentListItem);
					rootNode = null;
					currentIndex++;
				} else {
					return null;
				}

				block = null;

				if (listArray.length <= currentIndex || Math.max(listArray[currentIndex].indent, 0) < indentLevel) {
					break;
				}
			}

			if (database) {
				var currentNode = retval.getFirst(),
					listRoot = listArray[0].parent;

				while (currentNode) {
					if (currentNode.type == CKEDITOR.NODE_ELEMENT) {
						// Clear marker attributes for the new list tree made of cloned nodes, if any.
						CKEDITOR.dom.element.clearMarkers(database, currentNode);

						// Clear redundant direction attribute specified on list items.
						if (currentNode.getName() in CKEDITOR.dtd.$listItem) {
							cleanUpDirection(currentNode);
						}
					}

					currentNode = currentNode.getNextSourceNode();
				}
			}

			return {
				listNode: retval,
				nextIndex: currentIndex
			};
		}
	};

	/**
	 * Converts dt <-> dd nodes
	 * In general case this function just renames dt or dd node
	 */

	function changeListType(editor, groupObj, database) {
		// if one list item contains all selected nodes
		// and count of selected nodes < list item children
		// move all of selected nodes to the new list item
		// and then rename list item
		var listItem,
		isTheSameListItem = true,
			selectedNodes = [],
			length = groupObj.contents.length,
			i;
		for (i = 0; i < length; i++) {
			var item = groupObj.contents[i];
			if (!(item.getName() in CKEDITOR.dtd.dl)) {
				var currentListItem = item.getAscendant(CKEDITOR.dtd.dl);
				if (!listItem || listItem.equals(currentListItem)) {
					if (!item.getParent().equals(currentListItem)) {
						item = currentListItem.getFirst(function(node) {
							return node.contains(item);
						});
					}

					if (item && !item.getCustomData('dl_node_processed')) {
						item.setCustomData('dl_node_processed', 1);
						selectedNodes.push(item);
					}

					listItem = currentListItem;
				} else {
					isTheSameListItem = false;
					break;
				}
			}
		}

		if (isTheSameListItem && selectedNodes.length && selectedNodes.length < listItem.getChildCount()) {
			var sel = editor.getSelection(),
				ranges = sel && sel.getRanges(),
				range = ranges && ranges[0],
				bookmark = range && range.createBookmark(true);

			if (bookmark) {
				var rangeToSplit = new CKEDITOR.dom.range(editor.document),
					newListItem;
				rangeToSplit.setStartAt(selectedNodes[0], CKEDITOR.POSITION_BEFORE_START);
				rangeToSplit.collapse(true);
				newListItem = rangeToSplit.splitElement(listItem);

				if (selectedNodes.length < newListItem.getChildCount()) {
					rangeToSplit.setStartAt(selectedNodes[selectedNodes.length - 1], CKEDITOR.POSITION_AFTER_END);
					rangeToSplit.collapse(true);
					rangeToSplit.splitElement(newListItem);
				}

				range.moveToBookmark(bookmark);
				range.select();
			}
		}

		for (var i = 0; i < selectedNodes.length; i++) {
			selectedNodes[i].removeCustomData('dl_node_processed');
		}

		var nodesProcessed = [];
		for (var i = 0, length = groupObj.contents.length; i < length; i++) {
			var contentNode = groupObj.contents[i],
				itemNode = contentNode.getAscendant(CKEDITOR.dtd.dl, true);

			if (!itemNode || itemNode.is(this.type) || itemNode.getCustomData('list_item_processed')) {
				continue;
			}

			itemNode.renameNode(this.type);
			itemNode.setCustomData('list_item_processed', 1);
			nodesProcessed.push(itemNode);
		}

		var elementNodeEvaluator = function(node) {
			return node.type == CKEDITOR.NODE_ELEMENT;
		};

		// dt can't contain some elements (i.e. block elements)
		// and we need to remove such elements to keep valid markup
		for (var i = 0; i < nodesProcessed.length; i++) {
			var itemNode = node = nodesProcessed[i],
				startFromSibling = false;

			itemNode.removeCustomData('list_item_processed');

			while (node = node.getNextSourceNode(startFromSibling, CKEDITOR.NODE_ELEMENT, itemNode)) // one =
			{
				if (!CKEDITOR.dtd[this.type][node.getName()]) {
					var parent = node.getParent();
					node.remove(true);
					node = parent;
					startFromSibling = false;
				} else {
					startFromSibling = true;
				}
			}
		}
	}

	var headerTagRegex = /^h[1-6]$/;

	function createList(editor, groupObj) {
		var contents = groupObj.contents,
			doc = groupObj.root.getDocument(),
			listContents = [];

		// It is possible to have the contents returned by DomRangeIterator to be the same as the root.
		// e.g. when we're running into table cells.
		// In such a case, enclose the childNodes of contents[0] into a <div>.
		if (contents.length == 1 && contents[0].equals(groupObj.root)) {
			var divBlock = doc.createElement('div');
			contents[0].moveChildren && contents[0].moveChildren(divBlock);
			contents[0].append(divBlock);
			contents[0] = divBlock;
		}

		// Calculate the common parent node of all content blocks.
		var commonParent = groupObj.contents[0].getParent();
		for (var i = 0; i < contents.length; i++)
		commonParent = commonParent.getCommonAncestor(contents[i].getParent());

		var useComputedState = editor.config.useComputedState,
			listDir, explicitDirection;

		useComputedState = useComputedState === undefined || useComputedState;

		// We want to insert things that are in the same tree level only, so calculate the contents again
		// by expanding the selected blocks to the same tree level.
		for (i = 0; i < contents.length; i++) {
			var contentNode = contents[i],
				parentNode;
			while ((parentNode = contentNode.getParent())) {
				if (parentNode.equals(commonParent)) {
					listContents.push(contentNode);

					// Determine the lists's direction.
					if (!explicitDirection && contentNode.getDirection()) {
						explicitDirection = 1;
					}

					var itemDir = contentNode.getDirection(useComputedState);

					if (listDir !== null) {
						// If at least one LI have a different direction than current listDir, we can't have listDir.
						if (listDir && listDir != itemDir) listDir = null;
						else listDir = itemDir;
					}

					break;
				}
				contentNode = parentNode;
			}
		}

		if (listContents.length < 1) {
			return;
		}

		// Insert the list to the DOM tree.
		var insertAnchor = listContents[listContents.length - 1].getNext(),
			listNode = doc.createElement('dl');

		var contentBlock, listItem;

		while (listContents.length) {
			contentBlock = listContents.shift();
			listItem = doc.createElement(this.type == 'dl' ? 'dt' : this.type);

			// Preserve preformat block and heading structure when converting to list item. (#5335) (#5271)
			if (this.type == 'dd' && (contentBlock.is('pre') || headerTagRegex.test(contentBlock.getName()))) {
				contentBlock.appendTo(listItem);
			} else {
				contentBlock.copyAttributes(listItem);
				// Remove direction attribute after it was merged into list root. (#7657)
				if (listDir && contentBlock.getDirection()) {
					listItem.removeStyle('direction');
					listItem.removeAttribute('dir');
				}
				contentBlock.moveChildren(listItem);
				contentBlock.remove();
			}

			listItem.appendTo(listNode);
		}

		// Apply list root dir only if it has been explicitly declared.
		if (listDir && explicitDirection) {
			listNode.setAttribute('dir', listDir);
		}

		/**
		 * Keep li element
		 * @see EDT-271
		 * @author MindTouch
		 */
		if (commonParent.is('ol', 'ul')) {
			var li = doc.createElement('li');
			listNode.appendTo(li);
			listNode = li;
		}
		/* END */

		if (insertAnchor) {
			listNode.insertBefore(insertAnchor);
		} else {
			listNode.appendTo(commonParent);
		}
	}

	function removeList(editor, groupObj, database) {
		// This is very much like the change list type operation.
		// Except that we're changing the selected items' indent to -1 in the list array.
		var listArray = CKEDITOR.plugins.definitionList.listToArray(groupObj.root, database),
			selectedListItems = [];

		for (var i = 0; i < groupObj.contents.length; i++) {
			var itemNode = groupObj.contents[i];
			itemNode = itemNode.getAscendant(CKEDITOR.dtd.dl, true);
			if (!itemNode || itemNode.getCustomData('list_item_processed')) {
				continue;
			}
			selectedListItems.push(itemNode);
			CKEDITOR.dom.element.setMarker(database, itemNode, 'list_item_processed', true);
		}

		var lastListIndex = null;
		for (i = 0; i < selectedListItems.length; i++) {
			var listIndex = selectedListItems[i].getCustomData('listarray_index');
			listArray[listIndex].indent = -1;
			lastListIndex = listIndex;
		}

		// After cutting parts of the list out with indent=-1, we still have to maintain the array list
		// model's nextItem.indent <= currentItem.indent + 1 invariant. Otherwise the array model of the
		// list cannot be converted back to a real DOM list.
		for (i = lastListIndex + 1; i < listArray.length; i++) {
			if (listArray[i].indent > listArray[i - 1].indent + 1) {
				var indentOffset = listArray[i - 1].indent + 1 - listArray[i].indent;
				var oldIndent = listArray[i].indent;
				while (listArray[i] && listArray[i].indent >= oldIndent) {
					listArray[i].indent += indentOffset;
					i++;
				}
				i--;
			}
		}

		var newList = CKEDITOR.plugins.definitionList.arrayToList(listArray, database, null, editor.config.enterMode, groupObj.root.getAttribute('dir'));

		var docFragment = newList.listNode;
		docFragment.replace(groupObj.root);
	}

	function defListCommand(name, type) {
		this.name = name;
		this.type = type;
		this.context = 'dl';
		if (type != 'dl') {
			this.allowedContent = 'dl ' + type;
		}
		this.requiredContent = type;
	}

	defListCommand.prototype = {
		exec: function(editor) {
			this.refresh( editor, editor.elementPath() );

			var doc = editor.document,
				config = editor.config,
				selection = editor.getSelection(),
				ranges = selection && selection.getRanges(true);

			// Midas lists rule #1 says we can create a list even in an empty document.
			// But DOM iterator wouldn't run if the document is really empty.
			// So create a paragraph if the document is empty and we're going to create a list.
			if (this.state == CKEDITOR.TRISTATE_OFF) {
				var editable = editor.editable();
				if (!editable.getFirst( nonEmpty )) {
					config.enterMode == CKEDITOR.ENTER_BR ? editable.appendBogus() : ranges[0].fixBlock(1, config.enterMode == CKEDITOR.ENTER_P ? 'p' : 'div');

					selection.selectRanges(ranges);
				}
				// Maybe a single range there enclosing the whole list,
				// turn on the list state manually(#4129).
				else {
					var range = ranges.length == 1 && ranges[0],
						enclosedNode = range && range.getEnclosedNode();
					if (enclosedNode && enclosedNode.is && this.type == enclosedNode.getName()) {
						this.setState(CKEDITOR.TRISTATE_ON);
					}
				}
			} else if (listNodeNames[this.type]) {
				// If this.type == dl and we are at the end of the list
				// create the new list item to exit the list
				// and don't remove the last list item
				var range = ranges && ranges[0];
				if (range && range.collapsed && range.checkEndOfBlock()) {
					var itemNode = range.startContainer.getAscendant(CKEDITOR.dtd.dl, true);
					if (itemNode.getParent().getLast().equals(itemNode) && (range.startContainer.equals(itemNode) || itemNode.getLast().equals(range.startContainer) || itemNode.getLast().contains(range.startContainer))) {
						var newNode = range.splitElement(itemNode);
						range.moveToPosition(newNode, CKEDITOR.POSITION_AFTER_START);
						range.select();
						selection = editor.getSelection();
						ranges = selection && selection.getRanges(true);
					}
				}
			}

			var bookmarks = selection.createBookmarks(true);

			// Group the blocks up because there are many cases where multiple lists have to be created,
			// or multiple lists have to be cancelled.
			var listGroups = [],
				database = {},
				rangeIterator = ranges.createIterator(),
				index = 0;

			while ((range = rangeIterator.getNextRange()) && ++index) {
				var boundaryNodes = range.getBoundaryNodes(),
					startNode = boundaryNodes.startNode,
					endNode = boundaryNodes.endNode;

				if (startNode.type == CKEDITOR.NODE_ELEMENT && startNode.getName() == 'td') {
					range.setStartAt(boundaryNodes.startNode, CKEDITOR.POSITION_AFTER_START);
				}

				if (endNode.type == CKEDITOR.NODE_ELEMENT && endNode.getName() == 'td') {
					range.setEndAt(boundaryNodes.endNode, CKEDITOR.POSITION_BEFORE_END);
				}

				var iterator = range.createIterator(),
					block;

				iterator.forceBrBreak = (this.state == CKEDITOR.TRISTATE_OFF);

				while ((block = iterator.getNextParagraph())) {
					// Avoid duplicate blocks get processed across ranges.
					if (block.getCustomData('list_block')) {
						continue;
					} else {
						CKEDITOR.dom.element.setMarker(database, block, 'list_block', 1);
					}

					var path = new CKEDITOR.dom.elementPath(block),
						pathElements = path.elements,
						pathElementsCount = pathElements.length,
						listNode = null,
						processedFlag = 0,
						blockLimit = path.blockLimit,
						element;

					// First, try to group by a list ancestor.
					for (var i = pathElementsCount - 1; i >= 0 && (element = pathElements[i]); i--) {
						if (listNodeNames[element.getName()] && blockLimit.contains(element)) {
							// Don't leak outside block limit (#3940).
							// If we've encountered a list inside a block limit
							// The last group object of the block limit element should
							// no longer be valid. Since paragraphs after the list
							// should belong to a different group of paragraphs before
							// the list. (Bug #1309)
							blockLimit.removeCustomData('list_group_object_' + index);

							var groupObj = element.getCustomData('list_group_object');
							if (groupObj) {
								groupObj.contents.push(block);
							} else {
								groupObj = {root: element, contents: [block]};
								listGroups.push(groupObj);
								CKEDITOR.dom.element.setMarker(database, element, 'list_group_object', groupObj);
							}
							processedFlag = 1;
							break;
						}
					}

					if (processedFlag) {
						continue;
					}

					// No list ancestor? Group by block limit, but don't mix contents from different ranges.
					var root = blockLimit;
					if (root.getCustomData('list_group_object_' + index)) {
						root.getCustomData('list_group_object_' + index).contents.push(block);
					} else {
						groupObj = {root: root, contents: [block]};
						CKEDITOR.dom.element.setMarker(database, root, 'list_group_object_' + index, groupObj);
						listGroups.push(groupObj);
					}
				}
			}

			// Now we have two kinds of list groups, groups rooted at a list, and groups rooted at a block limit element.
			// We either have to build lists or remove lists, for removing a list does not makes sense when we are looking
			// at the group that's not rooted at lists. So we have three cases to handle.
			while (listGroups.length > 0) {
				groupObj = listGroups.shift();
				if (this.state == CKEDITOR.TRISTATE_OFF) {
					if (listNodeNames[groupObj.root.getName()]) {
						changeListType.call(this, editor, groupObj, database);
					} else {
						createList.call(this, editor, groupObj);
					}
				} else if (this.state == CKEDITOR.TRISTATE_ON && listNodeNames[groupObj.root.getName()]) {
					removeList.call(this, editor, groupObj, database);
				}
			}

			// Clean up, restore selection and update toolbar button states.
			CKEDITOR.dom.element.clearAllMarkers(database);
			selection.selectBookmarks(bookmarks);
			editor.focus();
		},
		refresh: function(editor, path) {
			var list = path.contains(this.type, 1),
				limit = path.blockLimit || path.root;

			if (list && limit.contains(list)) {
				this.setState(CKEDITOR.TRISTATE_ON);
			} else {
				this.setState(CKEDITOR.TRISTATE_OFF);
			}
		}
	};

	CKEDITOR.plugins.add('mindtouch/definitionlist', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'definitionlist,definitionterm,definitiondescription', // %REMOVE_LINE_CORE%
		requires: 'list',
		init: function(editor) {
			if (editor.blockless) {
				return;
			}

			var definitionListCommand = editor.addCommand('definitionlist', new defListCommand('definitionlist', 'dl')),
				definitionTermCommand = editor.addCommand('definitionterm', new defListCommand('definitionterm', 'dt')),
				definitionDescCommand = editor.addCommand('definitiondesc', new defListCommand('definitiondesc', 'dd'));

			var lang = editor.lang['mindtouch/definitionlist'];
			editor.ui.addButton('DefinitionList', {
					label: lang.dl,
					command: 'definitionlist',
					directional: true,
					toolbar: 'list,30'
			});
			editor.ui.addButton('DefinitionTerm', {
					label: lang.dt,
					command: 'definitionterm',
					directional: true,
					toolbar: 'list,40'
			});
			editor.ui.addButton('DefinitionDescription', {
					label: lang.dd,
					command: 'definitiondesc',
					directional: true,
					toolbar: 'list,50'
			});

			editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.SHIFT + 57 /*9*/, 'definitionlist');
		},
		onLoad: function() {
			CKEDITOR.addCss('dl {' +
					'padding: 0;' +
					'margin: 0;' +
				'}' +
				'dl dt {' +
					'font-weight: bold;' +
				'}' +
				'dl dd {' +
					'border-bottom: 1px dashed #999;' +
					'margin: 0 0 20px 0;' +
					'padding: 2px 0 4px 16px;' +
				'}'
			);
		}
	});
})();
