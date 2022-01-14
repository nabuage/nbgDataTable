(function($) {
    $.fn.dataTableExt.oApi.fnReloadAjax = function(oSettings, sNewSource, fnCallback, bStandingRedraw)
    {
        if (sNewSource !== undefined && sNewSource !== null) {
            oSettings.sAjaxSource = sNewSource;
        }

        // Server-side processing should just call fnDraw
        if (oSettings.oFeatures.bServerSide) {
            this.fnDraw();
            return;
        }

        this.oApi._fnProcessingDisplay(oSettings, true);
        var that = this;
        var iStart = oSettings._iDisplayStart;
        var aData = [];

        this.oApi._fnServerParams(oSettings, aData);

        oSettings.fnServerData.call(oSettings.oInstance, oSettings.sAjaxSource, aData, function(json) {
            /* Clear the old information from the table */
            that.oApi._fnClearTable(oSettings);

            /* Got the data - add it to the table */
            var aData = (oSettings.sAjaxDataProp !== "") ?
                    that.oApi._fnGetObjectDataFn(oSettings.sAjaxDataProp)(json) : json;

            for (var i = 0; i < aData.length; i++)
            {
                that.oApi._fnAddData(oSettings, aData[i]);
            }

            oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();

            that.fnDraw();

            if (bStandingRedraw === true)
            {
                oSettings._iDisplayStart = iStart;
                that.oApi._fnCalculateEnd(oSettings);
                that.fnDraw(false);
            }

            that.oApi._fnProcessingDisplay(oSettings, false);

            /* Callback user function - for event handlers etc */
            if (typeof fnCallback == 'function' && fnCallback !== null)
            {
                fnCallback(oSettings);
            }
        }, oSettings);
    };

    /*
     * Format the date
     */
    $.fn.dataTableExt.oApi.getFormattedDate = function(oSettings, date)
    {
        var weekday = new Array(7);
        weekday[0] = "Sun";
        weekday[1] = "Mon";
        weekday[2] = "Tue";
        weekday[3] = "Wed";
        weekday[4] = "Thu";
        weekday[5] = "Fri";
        weekday[6] = "Sat";

        try {
            var dayOfTheWeek = weekday[date.getDay()];
            var mon = (date.getMonth() + 1).toString().length === 1 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
            var day = date.getDate().toString().length === 1 ? "0" + date.getDate() : date.getDate();
            var year = date.getFullYear().toString().substr(2, 2);
            var hr = date.getHours() < 12 ? date.getHours() : date.getHours() - 12;
            hr = hr.toString() === "0" ? "12" : hr;
            hr = hr.toString().length === 1 ? "0" + hr : hr;
            var min = date.getMinutes().toString().length === 1 ? "0" + date.getMinutes() : date.getMinutes();
            var sec = date.getSeconds().toString().length === 1 ? "0" + date.getSeconds() : date.getSeconds();
            var ampm = date.getHours() < 12 ? "AM" : "PM";
            return dayOfTheWeek + " " + mon + "/" + day + "/" + year + " " + hr + ":" + min + " " + ampm + " ";
        } catch (err) {
            return '';
        }
    };

    /*
     * Replace "[#]" with the value from data(array) using the "#" as index 
     */
    $.fn.dataTableExt.oApi.nbgParseText = function(oSettings, text, data)
    {
        var parsedText = text;

        if (text.indexOf("[") !== -1) {
            var indices = parsedText.match(/[^[]+(?=\])/g);

            for (var i = 0; i < indices.length; i++) {
                var indexValue = data[indices[i]];
                
                if (indexValue === undefined || indexValue === null) {
                    indexValue = "";
                }
                else {
                    if (this.isDate(indexValue)) {
                        //If data is of Date type, format it for display
                        indexValue = this.getFormattedDate(new Date(indexValue));
                    }
                    else if (typeof indexValue === "string") {
                    	indexValue = indexValue.replace(/\|/g, "<br>");
                    }
                }                
                
                parsedText = parsedText.replace("[" + indices[i] + "]", indexValue);
            }
        }

        return parsedText;

    };

    /*
     * Get formatted additional data
     */
    $.fn.dataTableExt.oApi.nbgFormatedAdditionalData = function(oSettings, dataItems, data)
    {
        var formattedData = "";

        for (var i = 0; i < dataItems.length; i++) {
            formattedData += this.nbgParseText(dataItems[i], data) + "<br>";
        }

        return formattedData;

    };
    
    /*
     * Check if text is a Date
     */
    $.fn.dataTableExt.oApi.isDate = function(oSettings, data)
    {
        if (data !== undefined && data !== null && typeof data !== "number") {
            var dateCheck = new Date(data);
            return dateCheck instanceof Date && !isNaN(dateCheck.valueOf());
        }
        else {
            return false;
        }
    };    
    

    $.fn.nbgDataTable = function(settings) {
        /*
         * "nbgDataIDIndex": ID column of sAjaxSource JSON
         * Additional aoColumns property for customization:
         * Checkbox Column = "nbgDisplayType":"checkbox", "nbgValueIndex":"index of data that will be in checkbox value property"
         * Link Column = "nbgDisplayType":"link", "nbgURL":"href value - can also use [data index] for value replacement", "nbgAdditionalData":"Expandable additional Text value below the link text - can also use [data index] for value replacement", "nbgOnClick":"function(linkObject, rowData) callback when url is clicked"
         * Date Column = if sType = date, use the following format: Day mm/dd/yy hh:mm AM/PM tz
         */
        var config = {
            sDom: '<"nbgDataTableHeaderToolbar"<"H"f>>rt<"F"pl>',
            bProcessing: false,
            sAjaxSource: "",
            sAjaxDataProp: "DATA",
            nbgDataIDIndex: -1,
            bServerSide: false,
            aoColumns: [],
            aaSorting: [],
            fnInitComplete: function(oSettings, json) {},
            nbgGroupBy: {},
            nbgOnBeforeDataLoad: function(element){
                try{
                    // show loading animation
                }catch(error){}
            },
            nbgOnAfterDataLoad: function(element){
                try{
                    // hide loading animation
                }catch(error){}
            },
            nbgEmptyTableMessage: "No data found.",
            bLengthChange: true,
            bPaginate: true,
			bAutoWidth: false,
			nbgOnButtonStateChange: function(button, selectedData) {
			},
			aaSortingFixed: [],
			customSetting: {appendValueToCheckboxName: false},
            nbgSingleCheckedPerRow: true, /*Only one checked checkboxes per row*/
            nbgAllowSelectAll: false
        };
        
        var groupingConfig = {
        		bHideGroupingColumn: false, 
        		bHideGroupingOrderByColumn: true, 
        		sGroupingColumnSortDirection: "asc"
			};

        if (settings) {
            $.extend(config, settings);
        }

        var $self = $(this);

        var selectedRowData = new Array();

        var addSelectedRowData = function(data) {
        	var rowIndex = -1;
        	
        	for (var i = 0, count = selectedRowData.length; i < count; i++) {

                if (selectedRowData[i][config.nbgDataIDIndex] === data[config.nbgDataIDIndex]) {
                	rowIndex = i;
                    break;
                }
            }
        	
        	if (rowIndex === -1) {
        		selectedRowData.push(data);
        	}
        	else {
        		selectedRowData[rowIndex] = data;
        	}
            
            updateToolbarButtonState();
        };
        
        var buildCheckboxName = function(name, value) {
        	var checkboxName = "";
        	
        	if (name !== undefined) {
                if (config.customSetting.appendValueToCheckboxName)  {
                    checkboxName = " name='" + name + "-" + value + "' ";
                }
                else {
                    checkboxName = " name='" + name + "' ";
                }
            }
            else {
                if (config.customSetting.appendValueToCheckboxName) {
                    checkboxName = " name='" + value + "' ";
                }
                else {
                    checkboxName = "";
                }
            }
            
            return checkboxName;
        };
        
        var imageSource = new Array();
        var imageText = new Array();
        var imageClass = new Array();
        var imageTitle = new Array();
        
        var URL = new Array();
        var additionalData = new Array();
        var prependOnRender = new Array();
        var onCellCreated = new Array();
        var onURLClick = new Array();
        var timezoneIndex = new Array();
        var appendOnRender = new Array();
        var textStyle = new Array();
        
        var dataLoadIsActive = false;
        
        var isGroupingEnabled = false;

        //Must be set and reset so that checkbox/radio is rendered correctly.
        var columnIndexBeingUpdated = -1;

        var isFiltered = false;

        var removeFromSelectedRowData = function(data) {
        	
        	var count = selectedRowData.length;
        	
        	if (count > 0) {
        		for (var i = 0; i < count; i++) {

                    if (selectedRowData[i][config.nbgDataIDIndex] === data[config.nbgDataIDIndex]) {
                        selectedRowData.splice(i, 1);
                        break;
                    }
                }

                updateToolbarButtonState();
        	}

        };

        var updateToolbarButtonState = function() {
            var toolbarButtons = $self.parent().find("div[class*='nbgDataTableHeaderToolbar'] div.fg-toolbar button");

            for (var i = 0, count = toolbarButtons.length; i < count; i++) {

                var $button = $(toolbarButtons[i]);

                if (selectedRowData.length === 1 && $button.hasClass("single-select")) {

                    if ($button.hasClass("ui-state-disabled")) {
                        $button.removeClass("ui-state-disabled");
                        config.nbgOnButtonStateChange($button, selectedRowData);
                    }

                    $button.attr("disabled", false);
                }
                else if (selectedRowData.length >= 1 && $button.hasClass("multiple-select")) {

                    if ($button.hasClass("ui-state-disabled")) {
                        $button.removeClass("ui-state-disabled");
                        config.nbgOnButtonStateChange($button, selectedRowData);
                    }

                    $button.attr("disabled", false);
                }
                else {

                    if ($button.hasClass("single-select") || $button.hasClass("multiple-select")) {
                    	
                    	if (!$button.hasClass("ui-state-disabled")) {
                    		config.nbgOnButtonStateChange($button, selectedRowData);
                    	}
                    	
                        $button.addClass("ui-state-disabled").attr("disabled", true);
                    }

                }

            }

        };

        var configureSearchFieldBehavior = function() {
            var $filterInput = $self.parent().find(".nbgDataTableHeaderToolbar .dataTables_filter input");

            $filterInput.addClass("search_init");
            $filterInput.val("Search");

            $filterInput.on("focus", function() {
                if ($(this).hasClass("search_init")) {
                    $(this).removeClass("search_init");
                    $(this).val("");
                }
            });

            $filterInput.on("blur", function(event) {

                if ($.trim($(this).val()) === "") {                    
                    $(this).addClass("search_init");
                    $(this).val("Search");
                    isFiltered = false;
                }
                else {
                    isFiltered = true;
                }
            });

        };

        for (var i = 0; i < config.aoColumns.length; i++) {

            if (config.aoColumns[i]["sType"] === "date") {
                timezoneIndex[i.toString()] = config.aoColumns[i].nbgTimezoneIndex;

                config.aoColumns[i].fnCreatedCell =
                        function(nTd, sData, oData, iRow, iCol) {
                			
                			var timezone = undefined;
                			
                			if (timezoneIndex[iCol.toString()] !== undefined) {
                				timezone = oData[timezoneIndex[iCol.toString()]];
                			}
                            
                            $(nTd).html(this.isDate(sData) ? this.getFormattedDate(new Date(sData)) + ((timezone === undefined) ? "" : " " + timezone) : "");

                        };
            }
            
            if (config.aoColumns[i]["nbgDisplayType"] === "numeric") {
            	
            	config.aoColumns[i]["sType"] = "numeric";
                
            	config.aoColumns[i].fnCreatedCell =
                    function(nTd, sData, oData, iRow, iCol) {
                        $(nTd).addClass("numeric_column").html(sData);
                    };
                    
                config.aoColumns[i].mRender =
                    function(sData, sType, oData) {
                        
                        if (sType === "display") {
                            var data = "";
                        
                            if (sData !== null && sData !== undefined && !isNaN(sData)) {
                                //Format #,###
                                data = sData.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
                            }
                            
                        	return data;
                        }
                        else {
                            return sData;
                        }

                    };
            }

            if (config.aoColumns[i]["nbgDisplayType"] === "checkbox" || config.aoColumns[i]["nbgDisplayType"] === "radio") {

                config.aoColumns[i].bSearchable = false;

                if (config.aoColumns[i].nbgAllowSelectAll && config.aoColumns[i]["nbgDisplayType"] === "checkbox") {
                    config.aoColumns[i].sTitle = "<input type=\"" + config.aoColumns[i]["nbgDisplayType"] + "\" id=\"nbg-checkboxhead-" + i + "\">";
                }                

                config.aoColumns[i].mRender =
                        function(sData, sType, oData) {

                            if (sType === "display") {

                                if (columnIndexBeingUpdated === -1) {
                                    return sData;
                                }
                                else {
                                    if (sData === -2) {
                                        return "";
                                    }
                                    else {
                                        var name = buildCheckboxName(config.aoColumns[columnIndexBeingUpdated].nbgName, oData[config.nbgDataIDIndex]);

                                        return "<input type='" + config.aoColumns[columnIndexBeingUpdated]["nbgDisplayType"] + "' id='nbg-checkbox-" + columnIndexBeingUpdated + '-' + oData[config.nbgDataIDIndex] + "' " + name + " value='" + oData[config.nbgDataIDIndex] + "' " + ((sData >= 1) ? "CHECKED" : "") + ((sData === -1 || sData === 2) ? " DISABLED" : "") + "></input>";
                                    }
                                }
                                
                            }
                            else {
                                return sData;
                            }

                        };
                
                config.aoColumns[i].fnCreatedCell =
                    function(nTd, sData, oData, iRow, iCol) {
                		var name = buildCheckboxName(config.aoColumns[iCol].nbgName, oData[config.nbgDataIDIndex]);
                		var id = "nbg-checkbox";
                		
                		//Make sure that the selected row is updated 
                    	//during table creation. Update is done when 
                		//checkbox is clicked.
            			if (sData === 1 || sData === 2) {
                    		addSelectedRowData(oData);                            		
                    	}
                    	else {
                    		removeFromSelectedRowData(oData);
                    	}
                		
                		if (sData === -2) {
                			$(nTd).html("");
                		}
                		else {
                			$(nTd).addClass("column-center-align").html("<input type='" + config.aoColumns[iCol]["nbgDisplayType"] + "' id='" + id + "-" + iCol + '-' + oData[config.nbgDataIDIndex] + "' " + name + " value='" + oData[config.nbgDataIDIndex] + "' " + ((sData >= 1) ? "CHECKED" : "") + ((sData === -1 || sData === 2) ? " DISABLED" : "") + "></input>");
                		}
                		
                	};
                
            }
            
            if (config.aoColumns[i]["nbgDisplayType"] === "link" || config.aoColumns[i]["nbgDisplayType"] === "custom" ) {
                URL[i.toString()] = config.aoColumns[i].nbgURL;
                additionalData[i.toString()] = config.aoColumns[i].nbgAdditionalData;
                prependOnRender[i.toString()] = config.aoColumns[i].nbgPrependOnRender;
                onCellCreated[i.toString()] = config.aoColumns[i].nbgOnCellCreated;
                onURLClick[i.toString()] = config.aoColumns[i].nbgOnClick;
                timezoneIndex[i.toString()] = config.aoColumns[i].nbgTimezoneIndex;
                appendOnRender[i.toString()] = config.aoColumns[i].nbgAppendOnRender;
                textStyle[i.toString()] = config.aoColumns[i].nbgTextStyle;

                config.aoColumns[i].fnCreatedCell =
                        function(nTd, sData, oData, iRow, iCol) {
                	
                            var tdHTML = undefined;
                            var isURL = true;
                            var timezone = undefined;
                            
                            if (onCellCreated[iCol.toString()] !== undefined) {
                            	tdHTML = onCellCreated[iCol.toString()](oData);
                            }
                            
                            if (tdHTML === undefined) {
                            	var href = undefined;
                                
                                if (URL[iCol.toString()] !== undefined) {
                                    href = this.nbgParseText(URL[iCol.toString()], oData);
                                }
                                
                                if (href === undefined && onURLClick[iCol.toString()] === undefined) {
                                	isURL = false;
                                }
                                
                                if (timezoneIndex[iCol.toString()] !== undefined) {
                    				timezone = oData[timezoneIndex[iCol.toString()]];
                    			}
                                
                                var data = (config.aoColumns[iCol]["sType"] === "date" && this.isDate(sData)) ? this.getFormattedDate(new Date(sData)) + ((timezone === undefined) ? "" : " " + timezone) : sData;
                                
                            	if (additionalData[iCol.toString()] !== undefined) {
                                	var formattedAdditionalData = this.nbgFormatedAdditionalData(additionalData[iCol.toString()], oData);

                                    if (formattedAdditionalData !== "") {
                                        tdHTML = "<div class='datatable-link-toggle-icon'></div>" +
                                                "<div class='datatable-link-data'><ul>" +
                                                "<li class='datatable-link-text'>" + (prependOnRender[iCol.toString()] !== undefined ? prependOnRender[iCol.toString()](oData) : "") + 
                                                ((isURL === true) ?
                                                	"<a href='" + href + "' class='datatable-link-url' rel='" + iCol + "'" + (textStyle[iCol.toString()] !== undefined ? " style='" + textStyle[iCol.toString()] + "'" : "") + ">" + data + "</a>"
                                                	:
                                                	(textStyle[iCol.toString()] !== undefined ? "<span style='" + textStyle[iCol.toString()] + "'>" + data + "</span>" : data)
                                                ) +
                                                (appendOnRender[iCol.toString()] !== undefined ? appendOnRender[iCol.toString()](oData) : "") + 
                                        		"</li>" +
                                                "<li class='datatable-link-additional-data'>" +
                                                formattedAdditionalData +
                                                "</li>" +
                                                "</ul></div>";
                                    }
                                }
                                else {
                                    tdHTML = (prependOnRender[iCol.toString()] !== undefined ? prependOnRender[iCol.toString()](oData) : "") + 
                                    			(isURL ? "<a href='" + href + "' class='datatable-link-url' rel='" + iCol + "'>" + data + "</a>" : data);
                                }
                            }
                            
                            $(nTd).html(tdHTML);
                            
                        };
                
            }
            
            if (config.aoColumns[i]["nbgDisplayType"] === "image") {
                imageSource[i.toString()] = config.aoColumns[i].nbgImageSource;
                imageText[i.toString()] = config.aoColumns[i].nbgImageText;
                imageClass[i.toString()] = config.aoColumns[i].nbgClass;
                imageTitle[i.toString()] = config.aoColumns[i].nbgTitle;

                config.aoColumns[i].bSearchable = false;

                config.aoColumns[i].fnCreatedCell =
                        function(nTd, sData, oData, iRow, iCol) {

                            if (sData === 1) {
                                
                                $(nTd).addClass("image_column").html(
                                        //TODO: Add onLoad to show tooltip
                                        '<img onLoad=""' +
                                        ' src="' + imageSource[iCol] + '"' + 
                                        //alt text is optional
                                        ' alt="' + ((imageText[iCol] !== undefined) ? imageText[iCol] : '')  + '"' + 
                                        //title is optional
                                        ((imageTitle[iCol] !== undefined) ? ' title="' + this.nbgParseText(imageTitle[iCol], oData) + '"' : '') + 
                                        //class is optional
                                        ' class="datatable-image-' + iCol + ((imageClass[iCol] !== undefined) ? ' ' + imageClass[iCol] : '') + '"' + 
                                        '>');
                            }
                            else {
                                $(nTd).html("");
                            }

                        };
                        
                //Add click handler
                $self.on("click", ".datatable-image-" + i, function(event) {
                    event.preventDefault();

                    var index = $(this).attr("class").split(" ")[0].substring("datatable-image-".length);
                    var currentNode = this.parentNode;

                    //Find the closest parent TR node
                    while (currentNode.nodeName !== "TR") {
                        currentNode = currentNode.parentNode;
                    }

                    if (config.aoColumns[index].nbgOnClick !== undefined) {
                        //Call callback function
                        config.aoColumns[index].nbgOnClick(this, $self.dataTableObject.fnGetData(currentNode));
                    }

                });
            }

        }
        
        $self.on("click", "input[type='checkbox'][id^=nbg-checkboxhead-],input[type='radio'][id^=nbg-checkbox-head-]", function(event) {
            var data = undefined;
            var idProperties = $(this).attr("id").split("-");
            var columnIndex = parseInt(idProperties[2]);
            var value = ($(this).is(":checked") ? 1 : 0);
            var id = idProperties[3];
            var checkboxColumnIndices = [];
            var currentValue = undefined;
            var rowIndex = -1;

            if (isFiltered) {
                data = getFilteredData();
            }
            else {
                data = $self.getTableData();
            }

            if (config.nbgSingleCheckedPerRow && value === 1) {
                for (var i = 0, count = config.aoColumns.length; i < count; i++) {
                    if (config.aoColumns[i]["nbgDisplayType"] === "checkbox") {
                        if (i !== columnIndex) {
                            checkboxColumnIndices.push(i);
                        }                        
                    }
                }
            }
            
            for (var i = 0, count = data.length; i < count; i++) {                              
                
                currentValue = data[i][config.aoColumns[columnIndex].mData];
                if (currentValue === 1 || currentValue === 0) {
                    if (isFiltered) {
                        rowIndex = getRowIndexById(data[i][config.nbgDataIDIndex]);
                    }
                    else {
                        rowIndex = i;
                    }  
                    
                    updateRowData(columnIndex, rowIndex, value, $(this).is(":checked"));
                
                    if (config.nbgSingleCheckedPerRow && value === 1 && checkboxColumnIndices.length > 0) {
                        for (var x = 0, countX = checkboxColumnIndices.length; x < countX; x++) {
                            var checkboxDataIndex = config.aoColumns[checkboxColumnIndices[x]].mData;
                            var checkboxColumnIndex = checkboxColumnIndices[x];
                            if (data[i][checkboxDataIndex] === 1) {
                                updateRowData(checkboxColumnIndex, rowIndex, 0, true);
                            }
                        }
                    }
                }
                
            }

        });

        $self.on("mouseover", "input[type='checkbox'][id^=nbg-checkboxhead-],input[type='radio'][id^=nbg-checkbox-head-]", function(event) {
            var idProperties = $(this).attr("id").split("-");
            var columnIndex = parseInt(idProperties[2]);

            dataTable.fnSettings().aoColumns[columnIndex].bSort = false;
            dataTable.fnSettings().aoColumns[columnIndex].bSortable = false;
        });
        $self.on("mouseout", "input[type='checkbox'][id^=nbg-checkboxhead-],input[type='radio'][id^=nbg-checkbox-head-]", function(event) {
            var idProperties = $(this).attr("id").split("-");
            var columnIndex = parseInt(idProperties[2]);
            
            dataTable.fnSettings().aoColumns[columnIndex].bSort = true;
            dataTable.fnSettings().aoColumns[columnIndex].bSortable = true;
        });

        var uncheckCheckboxHead = function(manualUncheck) {

            if (manualUncheck) {
                $("input[type='checkbox'][id^=nbg-checkboxhead-]").attr("checked", false);
            }
            else {
                //Manual filter status check.
                var filterInput = $self.parent().find(".nbgDataTableHeaderToolbar .dataTables_filter input");
                var isFiltered = $.trim($(filterInput).val()) != "";
                var checkboxhead = $("input[type='checkbox'][id^=nbg-checkboxhead-]:checked");                

                for (var i = 0, count = checkboxhead.length; i < count; i++) {
                    var idProperties = $(checkboxhead[i]).attr("id").split("-");
                    var columnIndex = parseInt(idProperties[2]);

                    if (isFiltered) {
                        var checkbox =  $("input[type='checkbox'][id^=nbg-checkbox-" + columnIndex + "-]:not(:checked)");
                    
                        if (checkbox.length > 0) {
                            $(checkboxhead[i]).attr("checked", false);
                        }
                    }
                    else {
                        var data = $self.getTableData();

                        for (var x = 0, countX = data.length; x < countX; x++) {
                            if (data[x][config.aoColumns[columnIndex].mData] === 0) {
                                $(checkboxhead[i]).attr("checked", false);
                                break;
                            }
                        }
                    }
                    
                }
            }
            
        };

        $self.on("click", "input[type='checkbox'][id^=nbg-checkbox-],input[type='radio'][id^=nbg-checkbox-]", function(event) {
        	var data = $self.dataTableObject.fnGetData(this.parentNode.parentNode);
            var idProperties = $(this).attr("id").split("-");
            var columnIndex = parseInt(idProperties[2]);
            var value = ($(this).is(":checked") ? 1 : 0);
            var id = idProperties[3];
            var newData = [];
            var indexes = [];
            var checkboxes = undefined;
            
            newData.push(id);
            newData.push(value);
            indexes.push([1, columnIndex]);

            if ($(this).attr("type") === "radio") {
                selectedRowData = [];
            }
            else {
                //If nbgSingleCheckedPerRow, uncheck other checked boxes.
                if (config.nbgSingleCheckedPerRow) {
                    checkboxes = $(this.parentNode.parentNode).find("input[type='checkbox'][id^=nbg-checkbox-]");
                    for (var i = 0, count = checkboxes.length; i < count; i++) {
                        idProperties = $(checkboxes[i]).attr("id").split("-");

                        if (idProperties[2] != columnIndex && $(checkboxes[i]).is(":checked")) {
                            newData.push(0);
                            indexes.push([newData.length-1, idProperties[2]]);
                        }

                    }
                }
                
            }

            $self.updateDisplayColumnData([newData], indexes);
            
            //Call afterOnClick event
            if (config.aoColumns[columnIndex].nbgAfterOnClick !== undefined) {
            	config.aoColumns[columnIndex].nbgAfterOnClick(this, data);
            }

        });

        
        if (config.nbgGroupBy.iGroupingColumnIndex !== undefined) {
        	isGroupingEnabled = true;
        	$.extend(groupingConfig, config.nbgGroupBy);
        	
        	if (config.nbgGroupBy.bExpandableGrouping !== undefined && config.nbgGroupBy.bExpandableGrouping) {
        		config.bLengthChange = false;
                config.bPaginate = false;
        	}        	
        }
        
        if (config.nbgGrouping !== undefined) {
        	config.aaSortingFixed.unshift([config.nbgGrouping.columnIndex, config.nbgGrouping.orderByDirection]);

            if (!config.bPaginate) {
                config.sDom = '<"nbgDataTableHeaderToolbar"<"H"f>>rt<"nbgDataTableFooterToolbarHidden"<"F">>';
            }
        }

        var dataTable = $self.dataTable({
            "bJQueryUI": true,
            "sPaginationType": "full_numbers",
            "sDom": config.sDom,
            "oLanguage": {
                "sLengthMenu": ' | Records per Page: <select>' +
                		'<option value="10">10</option>' +
                        '<option value="25">25</option>' +
                        '<option value="50">50</option>' +
                        '<option value="100">100</option>' +
                        '<option value="500">500</option>' +
                        '<option value="1000">1000</option>' +
                        '</select>',
                "sSearch": "",
                "oPaginate": {
                	"sFirst": "<< First",
                	"sLast": "Last >>",
                	"sPrevious": "< Previous",
                	"sNext": "Next >"
                },
                "sEmptyTable": config.nbgEmptyTableMessage                  
            },
            "bProcessing": config.bProcessing,
            "sAjaxSource": config.sAjaxSource,
            "sAjaxDataProp": config.sAjaxDataProp,
            "bServerSide": config.bServerSide,
            "aoColumns": config.aoColumns,
            "aaSorting": config.aaSorting,
            "bDeferRender": true,
            "fnInitComplete": function(oSettings, json) {
            	config.fnInitComplete(oSettings, json);
            	
            },
            "fnServerData": function(sSource, aoData, fnCallback, oSettings) {
            	
            	if (!dataLoadIsActive) {
            		config.nbgOnBeforeDataLoad($self.parent());
            	}
            	
                oSettings.jqXHR = $.ajax({                	
                	"dataType": "JSON", 
                	"type": "GET", 
                	"url": sSource, 
                	"data": aoData, 
                	"success": fnCallback,
                	"complete": function(data, status) {
                		dataLoadIsActive = false;
                		config.nbgOnAfterDataLoad($self.parent());
            		}
                });
            },
            "bLengthChange": config.bLengthChange,
            "bPaginate": config.bPaginate,
			"bAutoWidth" : config.bAutoWidth,
			"iDisplayLength": 25,
			"aaSortingFixed": config.aaSortingFixed,
			"fnDrawCallback": function(oSettings) {
				
				if (oSettings.aiDisplay.length == 0) {
	                return;
	            }
	            
				if (config.nbgGrouping !== undefined) {
					var $tr = $self.find('tbody tr');
		            var columnCount = $tr.first().find("td").length;
		            var lastGroup = "";
		            var id = 0;
		            var visible = true;
		            var groupCount = 0;
                    var iconTypeState = (config.nbgGrouping.iconTypeState === undefined ? "collapsed" : config.nbgGrouping.iconTypeState);
                    var iconTypeFolderState = (config.nbgGrouping.iconTypeState === undefined ? "collapsed" : "open");
		            
		            for (var i = 0, count = $tr.length; i < count; i++) {
		                var iDisplayIndex = oSettings._iDisplayStart + i;
                        var data = oSettings.aoData[oSettings.aiDisplay[iDisplayIndex]]._aData;
		                var group = data[config.nbgGrouping.columnDataIndex];
		                
		                var iconType = "group";
		                var folderIcon = "";
		                
		                if (config.nbgGrouping.iconType !== undefined && config.nbgGrouping.iconType === "folder") {
		                	iconType = "folder";
		                	folderIcon = "<span class=\"nbg-group-icon ui-icon ui-icon-folder-" + iconTypeFolderState + "\" style=\"\"></span>";
		                }
		                
	                	var visibility = iconTypeState + "-" + iconType;
                        var groupData = undefined;
		                
		                if (group != lastGroup) {
		                	var $trGroup = $("<tr/>");
		                	var $tdGroup = $("<td/>");
                            var $tdGroupButton = $("<div style='float:right;'></div>");
		                	
		                	if (group === null) {
		                		visible = false;
		                	}
		                	
		                	if ($($tr[i]).attr("class").indexOf("nbg-group-") === -1) {
		                		id = "nbg-group-" + groupCount;
		                		groupCount++;
			                }
		                	else {
		                		var classes = $($tr[i]).attr("class").split(" ");
		                		
		                		for (var ii = 0, counti = classes.length; ii < counti; ii++) {
		                			if (classes[ii].indexOf("nbg-group-") != -1) {
		                				id = classes[ii].replace("-item", "");
		                			}
		                		}
		                		
		                		if ($($tr[i]).is(":visible")) {
		                			visibility = "expanded-" + iconType;
		                			folderIcon = folderIcon.replace("ui-icon-folder-collapsed", "ui-icon-folder-open");
		                		}
		                		else {
		                			visibility = "collapsed-" + iconType;
		                		}
		                	}
		                	
		                	$tdGroup.attr("colSpan", columnCount);
		                	if (visible) {
		                		$tdGroup.html(folderIcon + group);
		                		$tdGroup.addClass("group group-item-expander " + visibility);
		                	}
		                	else {
		                		$tdGroup.text("");
		                		$tdGroup.addClass("group");
		                		$tdGroup.attr("style", "padding: 1px;");
		                	}		                	
		                	
                            if (config.nbgGrouping.uiButtons !== undefined) {
                                for (var iButtons = 0, buttonsLength =  config.nbgGrouping.uiButtons.length; iButtons < buttonsLength; iButtons++) {
                                    $tdGroupButton.append($("<button class=\"nbg-group-button " + config.nbgGrouping.uiButtons[iButtons].id + "\">" + config.nbgGrouping.uiButtons[iButtons].text + "</button>").button({
                                        icons: {
                                            primary: config.nbgGrouping.uiButtons[iButtons].uiIcon
                                        }
                                    }));
                                }
                                $tdGroup.append($tdGroupButton);
                            }
                            
		                	$trGroup.attr("id", id);
		                	if (visible) {
		                		$trGroup.addClass("nbg-group");
		                		$trGroup.attr("style", "height: 1px;");
		                	}		                	
		                	$trGroup.append($tdGroup);
		                	
		                	$trGroup.insertBefore($tr[i]);
		                	
		                	lastGroup = group;
		                	
		                }
		                
		                if (visible && $($tr[i]).attr("class").indexOf("nbg-group-") === -1) {
                            if (data[config.nbgDataIDIndex] === null || data[config.nbgDataIDIndex] === "") {
                                $($tr[i]).hide();
                            }
                            else {
                                $($tr[i]).addClass(id + "-item");
                                if (iconTypeState !== "expanded") {
                                    $($tr[i]).hide();
                                }
                            }
		                			                	
		                }
		            }

                    $self.find("button.nbg-group-button").on("click", function(event){
                        event.preventDefault();
                        event.stopPropagation();
                        
                        for (var iButtons = 0, buttonsLength =  config.nbgGrouping.uiButtons.length; iButtons < buttonsLength; iButtons++) {
                            if ($(this).hasClass(config.nbgGrouping.uiButtons[iButtons].id) && config.nbgGrouping.uiButtons[iButtons].onClick !== undefined && typeof config.nbgGrouping.uiButtons[iButtons].onClick === "function") {
                                groupData = $self.dataTableObject.fnGetData(this.parentNode.parentNode.parentNode.nextSibling);
                                config.nbgGrouping.uiButtons[iButtons].onClick(this, groupData[config.nbgGrouping.dataIDIndex], groupData[config.nbgDataIDIndex]);
                            }
                        }
                    });
                    
				}

                uncheckCheckboxHead(false);
	            
		    },
            "fnRowCallback": function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                var checkedBox = $(nRow).find("input[type='checkbox'][id^=nbg-checkbox-]:checked,input[type='radio'][id^=nbg-checkbox-]:checked");

                if (checkedBox.length > 0) {
                    if (!$(nRow).hasClass("row_selected")) {
                        $(nRow).addClass("row_selected");
                    }
                }
                else {
                    $(nRow).removeClass("row_selected");
                }

            }            
        });
        
        if (isGroupingEnabled) {
            dataTable.rowGrouping(groupingConfig);
        }
        
        $self.on("click", ".nbg-group", function(event) {        	
        	var $td = $(this).find("td");
        	var $icon = $td.find(".nbg-group-icon");
        	
        	if ($icon.length > 0) {
        		if ($icon.hasClass("ui-icon-folder-open")) {
        			$icon.removeClass("ui-icon-folder-open");
        			$icon.addClass("ui-icon-folder-collapsed");
        			
        			$td.removeClass("expanded-folder");
            		$td.addClass("collapsed-folder");        			
            	}
        		else {
        			$icon.removeClass("ui-icon-folder-collapsed");
        			$icon.addClass("ui-icon-folder-open");
        			
        			$td.removeClass("collapsed-folder");
            		$td.addClass("expanded-folder");
        		}
        	}
        	else {
        		if ($td.hasClass("collapsed-group")) {
            		$td.removeClass("collapsed-group");
            		$td.addClass("expanded-group");
            	}
            	else {
            		$td.removeClass("expanded-group");
            		$td.addClass("collapsed-group");
            	}
        	}
        	
        	$self.find("." + $(this).attr("id") + "-item").toggle();
        	
        });

        
        
        //Add toggle handler
        $self.on("click", ".datatable-link-toggle-icon", function() {

            if ($(this).hasClass("datatable-link-toggle-icon-show")) {
                $(this).removeClass("datatable-link-toggle-icon-show");
                $(this).addClass("datatable-link-toggle-icon-hide");
                $(this).siblings(".datatable-link-data").children("ul").children("li.datatable-link-additional-data").hide();
            }
            else {
                $(this).removeClass("datatable-link-toggle-icon-hide");
                $(this).addClass("datatable-link-toggle-icon-show");
                $(this).siblings(".datatable-link-data").children("ul").children("li.datatable-link-additional-data").show();
            }

        });
        
        //Add click handler
        $self.on("click", ".datatable-link-url", function(event) {
            event.preventDefault();

            var index = $(this).attr("rel");
            var currentNode = this.parentNode;

            //Find the closest parent TR node
            while (currentNode.nodeName !== "TR") {
                currentNode = currentNode.parentNode;
            }

            //Call callback function
            config.aoColumns[index].nbgOnClick(this, $self.dataTableObject.fnGetData(currentNode));

        });

        $self.dataTableObject = dataTable;

        $self.reloadData = function(sourceURL, callback) {
            var url = sourceURL;

            if (url === "") {
                url = config.sAjaxSource;
            }

            //Reset selected row
            selectedRowData = new Array();
            
            updateToolbarButtonState();
            
            dataTable.fnReloadAjax(url, callback);

            uncheckCheckboxHead(true);
        };
        
        $self.getTableData = function() {
            return dataTable.fnGetData();
        };

        $self.getSelectedRowData = function() {
            var data = new Array();

            if (isFiltered) {
                //Return only based on the filtered result.
                data = getSelectedRowDataFromFilteredSearch();
            }
            else {
                //Make sure that nbgDataIDIndex is set
                if (config.nbgDataIDIndex > -1) {
                    data = selectedRowData.slice(0);
                }                
            }

            return data;
            
        };

        var getFilteredData = function() {
            return dataTable._('tr', {"filter": "applied"});
        };

        var getSelectedRowDataFromFilteredSearch = function() {
            var filteredData = getFilteredData();;
            var data = new Array();

            //Make sure that nbgDataIDIndex is set
            if (config.nbgDataIDIndex > -1) {
                for (var i = 0; i < filteredData.length; i++) {

                    //Make sure that selected data allow applies to the currently visible/filtered data.
                    for (var x = 0; x < selectedRowData.length; x++) {
                        if (filteredData[i][config.nbgDataIDIndex] === selectedRowData[x][config.nbgDataIDIndex]) {
                            data.push(filteredData[i]);
                            break;
                        }
                    }

                    //If the selectedRowData count is reach, stop looping. 
                    //No more selected data from this point
                    if (data.length === selectedRowData.length) {
                        break;
                    }
                }
            }


            return data;
        };

        $self.getSelectedRowDataByIndex = function(index) {
            var rowData = $self.getSelectedRowData();
            var data = new Array();

            for (var i = 0; i < rowData.length; i++) {
                data.push(rowData[i][index]);
            }

            return data;
        };
        
        $self.getRowById = function(dataIdIndex) {
            var nodes = dataTable.fnGetNodes();
            var data = undefined;
            var row = undefined;
            
            //Make sure that nbgDataIDIndex is set
            if (config.nbgDataIDIndex > -1) {
	            for (var i = 0, count = nodes.length; i < count; i++) {
	            	
	            	data = dataTable.fnGetData(nodes[i]);
	            	
	            	if (data !== undefined && data[config.nbgDataIDIndex] === dataIdIndex) {
	            		row = nodes[i];
	            		break;
	            	}
	            }
            }

            return row;
        };

        $self.getRowDataById = function(dataIdIndex) {
            return $self.dataTableObject.fnGetData($self.getRowById(dataIdIndex));
        }

        var getRowIndexById = function(id) {
            var data = $self.getTableData();
            var index = -1;

            for (var i = 0, count = data.length; i < count; i++) {
                if (id == data[i][config.nbgDataIDIndex]) {
                    index = i;
                    break;
                }
            }

            return index;
        };
        
        /*
         * data: 2d array of values that will be applied to the table column.
         * The first index (0) will be used to match against the id (nbgDataIDIndex) of
         * the data in the table.
         * sourceDestinationIndices: 2d array of source index and destination index. 
         * Source index is the index of the [data] parameter where value will be 
         * used to update the data in the data table.
         * Destination index is the index of the table column where update will be applied.
         * Example:
         * data: [[1,"data1","data2",100],[2,"data2","data3",200]]
         * sourceDestinationIndices: [[1,1],[2,3]]
         */
        $self.updateDisplayColumnData = function(data, sourceDestinationIndices) {
            
            var dataToUpdate = dataTable.fnGetData();
            
            //Find the row to update
            for (var i = 0, count = dataToUpdate.length; i < count; i++) {
                for (var x = 0, countX = data.length; x < countX; x++) {
                    
                    //Matching record is found?
                    if (dataToUpdate[i][config.nbgDataIDIndex] == data[x][0]) {
                    	var rowAdded = false;
                        
                        //Apply updates
                        for (var y = 0, countY = sourceDestinationIndices.length; y < countY; y++) {
                        	var sourceIndex = sourceDestinationIndices[y][1];
                        	var newData = data[x][sourceDestinationIndices[y][0]];
                        	
                        	//Make sure that column to update exist.
                        	if (config.aoColumns[sourceIndex] !== undefined) {
                                
                        		if (config.aoColumns[sourceIndex].nbgDisplayType !== undefined && (config.aoColumns[sourceIndex].nbgDisplayType === "checkbox" || config.aoColumns[sourceIndex].nbgDisplayType === "radio") && newData === 1) {
                                    rowAdded = true;                            		
                            	}
                                updateRowData(sourceIndex, i, newData, rowAdded);
                            	
                        	}
                        }
                        
                        //Remove so that next loop gets shorter.
                        data.splice(x, 1);
                        break;
                    }
                }                
            }
        };

        var updateRowData = function(columnIndex, rowIndex, newValue, rowAdded) {
            //Make sure that column to update exist.
            var data = dataTable.fnGetData();
            var id = data[rowIndex][config.nbgDataIDIndex];
            var checkboxElement = undefined;

            if (config.aoColumns[columnIndex] !== undefined) {
                if (config.aoColumns[columnIndex].nbgDisplayType !== undefined && (config.aoColumns[columnIndex].nbgDisplayType === "checkbox" || config.aoColumns[columnIndex].nbgDisplayType === "radio")) {
                    if (config.aoColumns[columnIndex].nbgDisplayType === "checkbox") {
                        checkboxElement = $self.find("input[type='checkbox'][value='" + id + "'][id^=nbg-checkbox-" + columnIndex + "-]");
                    }
                    else {
                        checkboxElement = $self.find("input[type='radio'][value='" + id + "'][id^=nbg-checkbox-" + columnIndex + "-]");
                    }                                    
                    
                    if (newValue === 1) {
                        //If a row is selected from grouping, toggle open the group.
                        if (config.nbgGrouping !== undefined) {
                            var classes = $(checkboxElement).parent("td").parent("tr").attr("class").split(" ");
                            
                            for (var ii = 0, counti = classes.length; ii < counti; ii++) {
                                if (classes[ii].indexOf("nbg-group-") != -1) {
                                    var iconType = "group";
                                    if (config.nbgGrouping.iconType !== undefined && config.nbgGrouping.iconType === "folder") {
                                        iconType = "folder";
                                    }
                                    if (!$self.find("#" + classes[ii].replace("-item", "") + " td:first").hasClass("expanded-" + iconType)) {
                                        $self.find("#" + classes[ii].replace("-item", "")).click();
                                    }            		                				
                                }
                            }
                        }

                        //Add
                        addSelectedRowData(data[rowIndex]);

                        //Highlight row
                        $(checkboxElement).parent("td").parent("tr").addClass("row_selected");
                        
                    }
                    else if (newValue === 0) {
                        $("input[type='checkbox'][id=nbg-checkboxhead-" + columnIndex + "]").attr("checked", false);
                        if (!rowAdded) {
                            //Remove
                            removeFromSelectedRowData(data[rowIndex]);

                            //Remove highlight on the row
                            $(checkboxElement).parent("td").parent("tr").removeClass("row_selected");
                        }
                    }
                }

                columnIndexBeingUpdated = columnIndex;
                dataTable.fnUpdate(newValue, rowIndex, columnIndex, false, false);
                columnIndexBeingUpdated = -1;
            }
        };
        
        $self.addToolbar = function() {
            $self.parent().find("div[class*='nbgDataTableHeaderToolbar']").append("<div class='fg-toolbar ui-toolbar toolbar-i'></div>");
        };

        $self.addToolbarButton = function(element, toolbarIndex) {
            var $toolbar = $self.parent().find("div[class*='nbgDataTableHeaderToolbar']");
            
            if ($toolbar.children("div.fg-toolbar").length !== 0) {
                
                if (toolbarIndex === undefined) {
                    toolbarIndex = 0;
                }
                
                if ($(element).is("button")) {
                
                    var buttons = $(element).filter("[class*='-select']");
                    
                    if (buttons.length === 1) {
                        //Only disable button with [*-select*] class
                        $(element).addClass("ui-state-disabled").attr("disabled", true);
                    }
                    
                }
                else {
                	
                    var buttons = $(element).find("button[class*='-select']");

                    for (var i = 0, count = buttons.length; i < count; i++) {
                        //Only disable button with [*-select*] class
                        $(buttons[i]).addClass("ui-state-disabled").attr("disabled", true);
                    }
                    
                }
                
                $($toolbar.children("div.fg-toolbar").get(toolbarIndex)).append($(element));
                
            }
        };
        
        $self.executeOnBeforeDataLoad = function(element) {
        	dataLoadIsActive = true;
        	config.nbgOnBeforeDataLoad((element !== undefined) ? element : $self.parent());
        };
        
        $self.executeOnAfterDataLoad = function(element) {
        	config.nbgOnAfterDataLoad((element !== undefined) ? element : $self.parent());
        };

        configureSearchFieldBehavior();

        return $self;
    };
})(jQuery);