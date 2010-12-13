/*
* jQuery UI JawesomeSelect 1.2.0
*
* Copyright (c) April 2009 Anthony Cameron
* Inspired and based on plug-in by http://www.emposha.com/javascript/fcbkcomplete.html
* Dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
* Options: 
*    autocomplete_delay: 500, (dictates how long (ms) after last keystroke to wait until executing the autocomplete)
*    height: "10", (specifies default number of elements to display in the autocomplete results)
*    allow_new_elements: false, (allows any user input to turn into a new token if true)
*    filter_case: false, (filters out matches that don't match case)
*    filter_selected: true, (filters out things already selected)
*    tooltip_initial_text: "Start typing to find, or <strong>click here</strong> to see the complete list", (the text to display upon initial load)
*    tooltip_results_text: "<strong>Click here</strong> to hide the list", (the text to display when there are results)
*    preselected_values: false, (when true: if there are any selected="selected" options in the <select>, then they will appear as tokens upon initialization)
*    multiselect_enabled: false (when true: the user can continue clicking on list items or using the keyboard to select from the current filter without it clearing itself)
*    sortable: false (when true: the user can re-order any of the tokens in the list, requires ui.sortable.js)
*    remote_datasource: false, (whether or not the results list should start off populated with a datasource other than the <options> in the checkbox, see fetched.txt for an example of the format of data you should return from your web service)
*    datasource_url: null, (supplies the url to be accessed for the datasource for the remote_datasource)
*    json_search_enabled: false, (not yet implemented, sends custom query to webservice every search to return custom results)
*    search_url: null, (not yet implemented, re: json_search_enabled)
*    search_cache_enabled: true (not yet implemented, caching of result sets if they exist to speed up autocomplete population and reduce server load)
*
* Depends:
*	ui.core.js
*   + ui.sortable.js (only if sortable is 'true' in options)
*/

(function($) {
    $.widget("ui.jawesomeselect", {

        _init: function() {
            // self is very important when you forget that 'this' refers to something else inside a jQuery method
            var o = this.options, self = this;

            // construct necessary DOM for the control
            this.element.wrap("<div class=\"jawesome_wrapper\"></div>");
            // hide the main <select> element (it stores what is selected but does not appear)
            this.element.hide();
            this.element.attr("multiple", "multiple");
            // todo: insure <select> has name="select1[]" multiple="multiple", both of which are absolutely necessary

            var display = $("<ul class=\"display\"><li class=\"inline-input\"><input class=\"maininput\"></input></li></ul>");
            var display_wrapper = $("<div class=\"display_wrapper\"></div>").append(display);

            var dropdown = $("<div class=\"dropdown\"></div>");
            var results = $("<ul class=\"results\"></ul>");
            var tooltip = $("<div class=\"tooltip\"><div class=\"help_text\"></div></div>");
            var control_close = $("<div class=\"control_close\"></div>").hide();
            tooltip.find(".help_text").append(o.tooltip_initial_text);
            tooltip.append(control_close);
            dropdown.append(results);
            dropdown.append(tooltip);

            this.element.after(display_wrapper);
            display_wrapper.after(dropdown);

            // populate results
            self._populate();
            if (o.remote_datasource) self._populateRemote();

            // if the select should begin with some elements selected or not:
            if (o.preselected_values) self._preselect();
            else self.clear();

            this.bindEvents();

            // only bind once, would be good to have a specific reference to this to unbind it specifically if needed rather than unbinding all $(document).click events
            $(document).click(function(e) {
                if (!self.isFocused) return;
                //console.log("click fire from " + self._control().find("select").attr("id"));
                var parent_wrapper = $(e.target).parents(".jawesome_wrapper");
                var isWidget = (parent_wrapper.length > 0);
                //console.log($(e.target));
                if (!isWidget) {
                    self.dropdownHide();
                    return;
                }
                else { // check to see if it's not THIS widget
                    if (self._control().find("select").attr("id") != parent_wrapper.find("select").attr("id")) {
                        self.dropdownHide();
                        return;
                    }
                }
            });
        },
        _control: function() {
            // returns the jQuery object of the entire control, starting at the wrapper
            return this.element.parent(".jawesome_wrapper");
        },
        _createResult: function(html, value, cssclass) {
            if (html == "" || value == "") return;
            return $("<li class=\"" + cssclass + "\" rel=\"" + value + "\">" + html + "</li>");
        },
        _createToken: function(html, value) {
            if (html == "" || value == "") return;

            var o = this.options, self = this;
            var closebutton = $("<div class=\"closebutton\"></div>");
            var token = $("<li class=\"token\" rel=\"" + value + "\"></li>");

            // when destroyed, animates the token fading out while removing it from the <select>
            closebutton.click(function() {
                self._destroyToken(token);
            });

            token.append(html);
            token.append(closebutton);

            return token;
        },
        _destroyToken: function(token) {
            // standard behaviour for removal of a single token
            var o = this.options, self = this;
            self.element.children("option[value=" + token.attr("rel") + "]").removeAttr("selected");
            token.fadeOut("fast", function() {
                token.remove();
            });
            self.focus();
        },
        _populate: function() {
            // appends to results pane each item in the original select box
            var self = this;
            this.element.children("option").each(function() {
                self.addResult($(this).text(), $(this).val(), "from_select hidden");
            });
        },
        _populateRemote: function() {
            // appends to results pane each item from a remote source
            var o = this.options, self = this;
            $.ajax({
                type: "GET",
                url: o.datasource_url,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(response) {
                    $(response).each(function() {
                        self.addResult(this.html, this.value, "from_remote hidden");
                    });
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {

                }
            });
        },
        _preselect: function() {
            // appends to display each item in token form that was selected=selected in the original select box
            var o = this.options, self = this;
            // adds the selected="selected" values into the display list
            this.element.children("option").each(function() {
                if ($(this).attr("selected")) {
                    self.addToken($(this).text(), $(this).val());
                }
            });
        },
        addToken: function(html, value) {
            // add a new token to the display of the widget
            if (html == "" || value == "") return;

            var o = this.options, self = this;
            var token = self._createToken(html, value);
            // add to display
            this._control().find(".inline-input").before(token);
            // find the option in the <select>
            var option = self.element.children("option[value=" + token.attr("rel") + "]");
            // if it doesn't exist for some reason, then add it
            if (option.length == 0) {
                option = $("<option value=\"" + token.attr("rel") + "\">" + token.attr("rel") + "</option>");
                self.element.append(option);
            }
            // then make it selected=selected
            option.attr("selected", "selected");
        },
        addResult: function(html, value, cssclass) {
            // add a new result to the dropdown of possible autocompletes
            if (html == "" || value == "") return;

            var o = this.options, self = this;
            var results = this._control().find(".results");

            results.append(self._createResult(html, value, cssclass));
        },
        deleteResults: function() {
            var o = this.options, self = this;
            var results = this._control().find(".results");

            results.html("");
        },
        dropdownHide: function() {
            // todo: maybe add a customizable callback
            this.isFocused = false;
            this._control().find(".dropdown").fadeOut("slow");
        },
        dropdownShow: function() {
            // todo: maybe add a customizable callback
            this.isFocused = true;
            this._control().find(".dropdown").fadeIn("slow");
        },
        clear: function() {
            // removes all tokens from display list and clears value on <select>
            var o = this.options, self = this;
            self._control().find(".display").children(":not(.inline-input)").remove();
            // not enough to simply do this.element.val("") with a multiple="multiple" <select>
            this.element.children("option").each(function() {
                $(this).removeAttr("selected")
            });
        },
        value: function() {
            return this.element.val();
        },
        focus: function() {
            // sends focus to the input field of control
            this._control().find(".maininput").focus();
            this.dropdownShow();
        },
        _delayedSearch: function(lastValue) {
            var o = this.options, self = this;
            var maininput = this._control().find(".maininput");

            // this method is only executed in the future from when it is called, so lastValue represents a value in the past
            // if it's not equal to what it was o.autocomplete_delay ms ago, then we won't search (b/c the user hasn't finished typing)            
            if (lastValue != maininput.val()) {
                return;
            }
            self._search();
        },
        _jsonSearch: function() {
            var o = this.options, self = this;
            var maininput = this._control().find(".maininput");

            $.ajax({
                type: "GET",
                url: o.json.url + "?value=" + maininput.val(),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function(response) {
                    $(response).each(function() {
                        //console.log(this);
                    });
                    o.json.onSuccess();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    o.json.onError();
                },
                complete: function() {
                    o.json.onComplete();
                }
            });
        },
        _search: function(empty_override) {
            var o = this.options, self = this;
            var maininput = this._control().find(".maininput");
            var results = this._control().find(".results");
            var tooltip = this._control().find(".tooltip");

            // new user typed element or results from JSON need to have events binded to them, so we unbind and rebind
            this.unbindEvents();

            // only search if the input isn't empty 
            if (maininput.val() != "" || empty_override) {
                if (o.allow_new_elements) {
                    results.children(".new_element").remove();
                    results.prepend(self._createResult(maininput.val(), maininput.val(), "new_element"));
                }

                results.children().removeClass("hidden");
                results.children().each(function() {
                    // selected filtering
                    if (o.filter_selected) {
                        if (self.element.children("option[value=" + $(this).attr("rel") + "][selected]").length) {
                            $(this).addClass("hidden");
                        }
                    }
                    // case filtering
                    if (o.filter_case) {
                        if ($(this).text().indexOf(maininput.val()) == -1) {
                            $(this).addClass("hidden");
                        }
                    }
                    else {
                        if ($(this).text().toLowerCase().indexOf(maininput.val().toLowerCase()) == -1) {
                            $(this).addClass("hidden");
                        }
                    }
                });
            }
            else {
                results.children().addClass("hidden");
            }

            results.children().removeClass("highlight");
            results.find("li:not('.hidden'):first").addClass("highlight");

            var numResults = results.children(":visible").length;
            if (numResults > o.height) {
                results.css({ "height": (o.height * 24) + "px", "overflow": "auto" });
            }
            else {
                results.css("height", "auto");
            }

            if (numResults > 0) {
                tooltip.find(".help_text").html(o.tooltip_results_text).addClass("results_text").removeClass("initial_text");
                tooltip.find(".control_close").show();
            }
            else {
                tooltip.find(".help_text").html(o.tooltip_initial_text).removeClass("results_text").addClass("initial_text");
                tooltip.find(".control_close").hide();
            }

            this.bindEvents();
        },
        bindEvents: function() {
            var o = this.options, self = this;
            var maininput = this._control().find(".maininput");
            var dropdown = this._control().find(".dropdown");
            var results = this._control().find(".results");
            var display = this._control().find(".display");
            var display_wrapper = this._control().find(".display_wrapper");
            var tooltip = this._control().find(".tooltip");

            maininput.focus(function() {
                if (!dropdown.is(":visible")) {
                    self.dropdownHide($(".dropdown"));
                    self.dropdownShow();
                    results.children().removeClass("highlight");
                    results.find("li:not('.hidden'):first").addClass("highlight");
                }
            });

            display_wrapper.click(function() {
                self.focus();
            });

            maininput.keydown(function(event) {
                var value = maininput.val();
                var activetoken = display.children("li.token.ui-state-active");
                var highlighted = results.children(".highlight");
                // backspace
                if (event.keyCode == 8) {
                    // we're backspacing and the input is empty
                    if (value.length == 0) {
                        // if there is no active token, the one closest to the input box becomes active
                        if (activetoken.length == 0) {
                            display.children("li.token:last").addClass("ui-state-active");
                        }
                    }
                    // delete the active token
                    if (activetoken.length != 0) {
                        self._destroyToken(activetoken);
                    }
                }
                // tab key
                else if (event.keyCode == 9) { // tab to another control
                    self.dropdownHide();
                }
                // delete arrow
                else if (event.keyCode == 46) {
                    if (activetoken.length != 0) {
                        event.preventDefault();
                        self._destroyToken(activetoken);
                    }
                }
                // left arrow
                else if (event.keyCode == 37) {
                    // if there is no active token, the one closest to the input box becomes active, or if there are multiple active due to mouse, a similar thing happens
                    if (activetoken.length == 0 || activetoken.length > 1) {
                        display.children().removeClass("ui-state-active");
                        display.children("li.token:last").addClass("ui-state-active");
                    }
                    // otherwise, we make the one to the left active
                    else {
                        var nextActive = activetoken.prev(".token");
                        activetoken.removeClass("ui-state-active");
                        nextActive.addClass("ui-state-active");
                    }
                }
                // right arrow
                else if (event.keyCode == 39) {
                    // if there is no active token, the one closest to the input box becomes active, or if there are multiple active due to mouse, a similar thing happens
                    if (activetoken.length == 0 || activetoken.length > 1) {
                        display.children().removeClass("ui-state-active");
                        display.children("li.token:first").addClass("ui-state-active");
                    }
                    // otherwise, we make the one to the left active
                    else {
                        var nextActive = activetoken.next(".token");
                        activetoken.removeClass("ui-state-active");
                        nextActive.addClass("ui-state-active");
                    }
                }
                // down arrow
                else if (event.keyCode == 40) {
                    if (highlighted.length == 0) {
                        results.children(":visible:first").addClass("highlight");
                        results.get(0).scrollTop = 0;
                    }
                    else {
                        highlighted.nextAll(":visible:first").addClass("highlight");
                        highlighted.removeClass("highlight");
                        highlighted = results.children(".highlight");
                        var prev = parseInt(highlighted.prevAll(":visible").length);
                        var next = parseInt(highlighted.nextAll(":visible").length);
                        if ((prev > Math.round(o.height / 2) || next <= Math.round(o.height / 2)) && typeof (highlighted.get(0)) != "undefined") {
                            results.get(0).scrollTop = parseInt(highlighted.get(0).scrollHeight) * (prev - Math.round(o.height / 2));
                        }
                    }
                    display.children().removeClass("ui-state-active");
                }
                // up arrow
                else if (event.keyCode == 38) {
                    if (highlighted.length == 0) {
                        results.children(":visible:last").addClass("highlight");
                    }
                    else {
                        highlighted.prevAll(":visible:first").addClass("highlight");
                        highlighted.removeClass("highlight");
                        highlighted = results.children(".highlight");
                        var prev = parseInt(highlighted.prevAll(":visible").length);
                        var next = parseInt(highlighted.nextAll(":visible").length);
                        if ((next > Math.round(o.height / 2) || prev <= Math.round(o.height / 2)) && typeof (highlighted.get(0)) != "undefined") {
                            results.get(0).scrollTop = parseInt(highlighted.get(0).scrollHeight) * (prev - Math.round(o.height / 2));
                        }
                    }
                    display.children().removeClass("ui-state-active");
                }
                // enter key
                else if (event.keyCode == 13) {
                    self.addToken(highlighted.text(), highlighted.attr("rel"));
                    highlighted.remove();
                    if (!o.multiselect_enabled) {
                        maininput.val("");
                    }
                    self._search();
                }
                else {
                    display.children().removeClass("ui-state-active");
                }
            });

            // escape key must be placed in keyup()
            maininput.keyup(function(event) {
                if (event.keyCode == 27) {
                    maininput.val("");
                    display.children().removeClass("ui-state-active");
                }
                // search must be on keyup since the input.val() does not exist on keydown(), but don't search when arrow keys are pressed
                if (event.keyCode != 40 && event.keyCode != 38 && event.keyCode != 37 && event.keyCode != 39) {
                    var lastValue = maininput.val(); // seems to be necessary, passing in maininput.val() to self._search somehow actually represents the current value not the last value
                    setTimeout(function() { self._delayedSearch(lastValue) }, o.autocomplete_delay);
                }
            });

            // toggle the active state of the token upon click
            display.children(".token").mousedown(function() {
                if ($(this).hasClass("ui-state-active")) {
                    $(this).removeClass("ui-state-active");
                }
                else {
                    $(this).addClass("ui-state-active");
                }
            });

            // allow sorting if specified
            if (o.sortable) {
                if (typeof (display.sortable) == 'function') { // only do it if the function is defined
                    display.sortable({
                        cursor: 'crosshair',
                        items: '.token',
                        stop: function(event, ui) {
                            display.children().removeClass("ui-state-active");
                        }
                    });
                }
                else { // user forgot to include the required dependency
                    throw "sortable() is not defined, perhaps you forgot to include the ui.sortable.js library";
                }
            }

            results.children().mouseover(function() {
                results.children().removeClass("highlight");
                $(this).addClass("highlight");
            });

            results.children().mouseout(function() {
                $(this).removeClass("highlight");
            });

            results.children().mousedown(function() {
                var highlighted = results.children(".highlight");
                self.addToken(highlighted.text(), highlighted.attr("rel"));
                highlighted.remove();
                if (o.multiselect_enabled) {
                    self._search(true);
                }
                else {
                    maininput.val("");
                    self._search();
                }
            });

            tooltip.children(".help_text").click(function() {
                if (tooltip.children(".help_text").hasClass("initial_text")) {
                    maininput.val("");
                    self._search(true);
                }
                else if (tooltip.children(".help_text").hasClass("results_text")) {
                    maininput.val("");
                    self._search();
                }
                else {
                    tooltip.children(".help_text").addClass("initial_text");
                    maininput.val("");
                    self._search(true);
                }
            });
            tooltip.children(".control_close").click(function() {
                maininput.val("");
                self._search();
            });
        },
        unbindEvents: function() {
            var o = this.options, self = this;
            var maininput = this._control().find(".maininput");
            var dropdown = this._control().find(".dropdown");
            var results = this._control().find(".results");
            var display = this._control().find(".display");
            var tooltip = this._control().find(".tooltip");

            maininput.unbind();
            dropdown.unbind();
            results.unbind();
            results.children().unbind();
            display.unbind();
            display.children().unbind();
            tooltip.children().unbind();
        },
        isFocused: false
    });

    $.extend($.ui.jawesomeselect, {
        version: "1.2.0",
        defaults: {
            autocomplete_delay: 500,
            height: "10",
            allow_new_elements: false,
            filter_case: false,
            filter_selected: true,
            tooltip_initial_text: "Start typing to find, or <strong>click here</strong> to see the complete list",
            tooltip_results_text: "<strong>Click here</strong> to hide the list",
            preselected_values: false,
            multiselect_enabled: false,
            sortable: false,
            remote_datasource: false,
            datasource_url: null,
            json_search_enabled: false,
            search_url: null,
            search_cache_enabled: true
        }
    });
})(jQuery);