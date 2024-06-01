/**
 * Unique ID attribute
 *
 * Snipped from: https://stackoverflow.com/a/15013922
 */

define(['knockout'], function(ko) {
    'use strict';

    ko.bindingHandlers.koDraw = {
			init: function(element, valueAccessor) {
				var target = valueAccessor();
        target(element);
			}
		};
});
