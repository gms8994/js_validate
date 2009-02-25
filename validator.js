var labels;
var doAlert = true;
var skipFields = "";

var types = new Array();
types = ["form","legend","input","textarea","select","password"];

function validate(parentObj) {
	if (!parentObj) { parentObj = document; }
	if (parentObj.elements) { types = parentObj.elements; }
	types = $.grep(types, function(a) { return !skipFields.match(a); } );
	var fields = $.grep(types, function(a) { return a.className; } );
	
	var result = true;
	for(var field = 0; field < fields.length; field++) {
		var fObj = fields[field];
		if (fObj.tagName.match(/fieldset/i)) { fObj = $(fObj).children("legend").get(0); }

		var t_result = validateField(fObj);
		if (parseInt(t_result) == t_result && field != 0) {
			result += t_result;
		} else if (parseInt(t_result) == t_result) {
			result = t_result;
		} else if (typeof(t_result) == "boolean" && t_result == false) {
			result = t_result; return result;
		}
	}
	return result;
}

function validateField(fObj) {
	var objClass = fObj.className; // get the objects className
	var lblText = returnLabelText(fObj.id); // get any associated label
	var tests = objClass.split(" "); // split the class information so that we can find all of the tests
	for(var test = 0; test < tests.length; test++) {
		var tObj = tests[test];
		var associatedNumber = 0;
		var associatedField = '';
		// if the tObj contains numbers, we need to split that off in to a separate variable
		if (results = tObj.match(/_(\d+)/)) { associatedNumber = results[1]; tObj = tObj.replace(/_\d+/, ""); }
		if (results = tObj.match(/(?:fieldsequal)_(.*?)$/)) { associatedField = results[1]; tObj = tObj.replace(/(fieldsequal)_.*?$/, "$1"); }
		if (results = tObj.match(/(?:oneortheother)_(.*?)$/)) { associatedField = results[1]; tObj = tObj.replace(/(oneortheother)_.*?$/, "$1"); }
		switch(tObj) {
			// if it's a required field, run these tests
			case 'required':
				if (fObj.type && (fObj.type.match(/(text|password)/) || fObj.tagName.match(/select/i))) {
					if ((fObj.type.match(/text|password/) && (!fObj.value || fObj.value.match(/^\s+?$/))) || (fObj.tagName.match(/select/i) && (!fObj.value || fObj.value < 1))) {
						return handleError({'txt':lblText+' is required!','focus':true,'field':fObj});
					}
					return true;
				// this test is for checkboxes
				} else if (fObj.tagName.match(/legend/i)) {
					// get all of the inputs inside it, loop them, validate them
					var somethingChecked = 0;
					$(fObj).siblings("input").each(
						function() {
							if (this.checked) { somethingChecked = 1; }
						}
					);
					$(fObj).parent().find("input").each(
						function() {
							if (this.checked) { somethingChecked = 1; }
						}
					);
					if (!somethingChecked) {
						return handleError({'txt':lblText+' is required!','field':fObj});
					}
					return true;
				}
				break;
			// if this should be a human name (we assume that all names have at least one space in them
			case 'humanname':
				if (fObj.value.indexOf(" ") == -1) {
					return handleError({'txt':lblText+' must be a valid full name!','focus':true,'select':true,'field':fObj});
				}
				return true;
				break;
			// email addresses
			case 'email': // doesn't properly validate!
				var email_addr = fObj.value;
				// i allow nothing between the @ and the .
				// i allow multiple @
				if (!email_addr.length || (email_addr.length && !email_addr.match(/^[^@]+@([^.]+\.)+[a-zA-Z]{2,6}$/))) {
					return handleError({'txt':lblText+' is not a valid email address!','focus':true,'select':true,'field':fObj});
				}
				return true;
				break;
			// minimum value
			case 'minimum':
				if (fObj.tagName.match(/form/i)) {
					var formFields = fObj.elements.length;
					var oldAlert = doAlert; doAlert = false;
					var oldSkipFields = skipFields; skipFields = "form";
					var result = validate();
					doAlert = oldAlert;
					skipFields = oldSkipFields;
					if (result < associatedNumber) {
						return handleError({'txt':'You must have at least '+associatedNumber+' form '+pluralize('field',associatedNumber)+' filled.','field':fObj});
					}
				// text fields assume a minimum length
				} else if (fObj.type.match(/text|password/)) {
					if (fObj.value.length < associatedNumber) {
						return handleError({'txt':lblText+' must be at least '+associatedNumber+' '+pluralize('character', associatedNumber)+'!','focus':true,'select':true,'field':fObj});
					}
					return true;
				// checkboxes assume that we require a minimum number checked
				} else if (fObj.type == 'checkbox') {
					var theseCheckboxes = document.getElementsByName(fObj.name);
					var somethingChecked = 0;
					for(var theCheckbox = 0; theCheckbox < theseCheckboxes.length; theCheckbox++) {
						var checkbox = theseCheckboxes[theCheckbox];
						if (checkbox.checked) {
							somethingChecked++;
						}
					}
					if (somethingChecked < associatedNumber) {
						return handleError({'txt':'In the section titled \''+returnLabelText($("#"+fObj.id).siblings("legend").attr("id"))+'\', you must check at least '+associatedNumber+' '+pluralize('checkbox', associatedNumber)+'!','field':fObj});
					}
				}
				break;
			// maximum value
			case 'maximum':
				if (fObj.tagName.match(/form/i)) {
					var formFields = fObj.elements.length;
					var oldAlert = doAlert; doAlert = false;
					var oldSkipFields = skipFields; skipFields = "form";
					var result = validate();
					doAlert = oldAlert;
					skipFields = oldSkipFields;
					if (result > associatedNumber) {
						return handleError({'txt':'You may not have more than '+associatedNumber+' form '+pluralize('field', associatedNumber)+' filled.','field':fObj});
					}						
				// text is only allowed to have this many characters
				} else if (fObj.type.match(/text|password/)) {
					if (fObj.value.length > associatedNumber) {
						return handleError({'txt':lblText+' can not be more than '+associatedNumber+' '+pluralize('character', associatedNumber)+'!','focus':true,'select':true,'field':fObj});
					}
				// checkbox can have up to this number checked
				} else if (fObj.type == 'checkbox') {
					var theseCheckboxes = document.getElementsByName(fObj.name);
					var somethingChecked = 0;
					for(var theCheckbox = 0; theCheckbox < theseCheckboxes.length; theCheckbox++) {
						var checkbox = theseCheckboxes[theCheckbox];
						if (checkbox.checked) {
							somethingChecked++;
						}
					}
					if (somethingChecked > associatedNumber) {
						return handleError({'txt':'In the section titled \''+returnLabelText($("#"+fObj.id).siblings("legend").attr("id"))+'\', you may only check up to '+associatedNumber+' '+pluralize('checkbox', associatedNumber)+'!','field':fObj});
					}
				}
				break;
			// should match a phone number
			case 'phonenumber':
				// this should match all numbers from http://en.wikipedia.org/wiki/List_of_country_calling_codes
				if (fObj.value.length >= 1 && !fObj.value.match(/^\+?\d{1,3}?[- .]?\(?(?:\d{2,3})\)?[- .]?\d\d\d[- .]?\d\d\d\d$/)) {
					return handleError({'txt':lblText+' is not a valid phone number!','focus':true,'select':true,'field':fObj});
				}
				break;
			// should match a url
			case 'url':
				if (fObj.value.length >= 1 && (!fObj.value.match(/(?:[a-zA-Z0-9]+\.?)+\.[a-zA-Z]{2,6}(?:\/.*?)?$/) && !fObj.value.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/.*?)?$/))) {
					return handleError({'txt':lblText+' is not a valid url format!','focus':true,'select':true,'field':fObj});
				}
				break;
			case 'fieldsequal':
				var fObj2; fObj2 = document.getElementById(associatedField);
				
				if (fObj.value != fObj2.value) {
					return handleError({'txt':lblText+' must match '+returnLabelText(fObj2.id)});
				}
				break;
			case 'oneortheother':
				var fObj2 = $("[name='" + associatedField + "']").get();
				for(var secondaryObjC = 0; secondaryObjC < fObj2.length; secondaryObjC++) {
					var secondaryObject = fObj2[secondaryObjC];
					if (secondaryObject.className.match(/oneortheother/)) {
						if (fObj.value && secondaryObject.value) {
							return handleError({'txt':lblText+' and '+returnLabelText(secondaryObject.id)+' cannot both be used'});
						}
						if (!fObj.value && !secondaryObject.value) {
							return handleError({'txt':'One of '+lblText+' and '+returnLabelText(secondaryObject.id)+' is required'});
						}
					}
				}
				break;
			case 'zip':
				if (!fObj.value.match(/^\d{5}(-\d{4})?$/)) {
					return handleError({'txt':lblText+' is not a valid zip code!','focus':true,'select':true,'field':fObj});
				}
			case 'digitonly':
				if (!fObj.value.match(/^\d+$/)) {
					return handleError({'txt':lblText+' may only contain numbers!'});
				}
				break;
            case 'float':
                if (fObj.value.match(/^\d+(\.\d+)?$/) || fObj.value.match(/^$/)) {
                } else {
                    return handleError({'txt':lblText+' may only contain numbers and a single decimal!'});
                }
                break;
			case 'alphaonly':
				if (!fObj.value.match(/[a-zA-Z]/)) {
					return handleError({'txt':lblText+' may only contain the letters A-Z!'});
				}
				break;
		}
	}
}

function returnLabelText(id) {
	var lblText = $("label[for='"+id+"']").text();
	if (!lblText) return '';
	return lblText.replace(/: ?/, "").replace(/\*/, "").replace(/^\s+/, "").replace(/\s+$/, "").replace(/\n.*$/, "");
}

function handleError(parms) {
	parms = eval(parms);
	if (!parms['focus']) { parms['focus'] = false; }
	if (!parms['select']) { parms['select'] = false; }
	alertProper(parms['txt']);
	if (parms['focus']) { parms['field'].focus(); }
	if (parms['select']) { parms['field'].select(); }
	return false;
}

function alertProper(txt) {
	if (doAlert) {
		alert(txt + '\n\nPlease click OK to continue');
	}
}

function pluralize(str, num) {
	if (str.match(/s$/)) {
		return str;
	}
	if (str.match(/(?:x)$/)) {
		if (num == 1) {
			return str;
		} else {
			return str + 'es';
		}
	}
	if (num == 1) {
		return str;
	} else {
		return str + 's';
	}
}
