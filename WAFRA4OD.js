// ==UserScript==
// @name         WAFRA4OD
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  WAFRA for Open Data (WAFRA4OD)
// @author       Cesar Gonzalez Mora
// @match        *://www.europeandataportal.eu/*
// @noframes
// @exclude      *://www.youtube.com/embed/*
// @grant        none
// @require http://code.jquery.com/jquery-3.3.1.slim.min.js
// @require http://code.jquery.com/jquery-3.3.1.min.js
// ==/UserScript==


/*********************** Variables ************************/
var myStorage = window.localStorage;
var readerRate = 1.0;
const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const recognition = new SpeechRecognition();
var timeoutResumeInfinity;

//var listeningActive = true;

var recognitionActive = true;
var recognitionFailedFirstTime = true;
var recognitionFailedText = "Command not recognised, please try again.";
var recognitionFailedTextES = "Comando no reconocido, por favor inténtelo de nuevo.";
var reading = false;
var readFirstTime = true;

var operations = [];

var languageCodeSyntesis = "en";
var languageCodeCommands = "en";

var spanishDomain = false;

var languageCodeSyntesisES = "es";
var languageCodeCommandsES = "es";

var listOperationsCommand = "list operations";
var welcomeCommand = "welcome";
var stopListeningCommand = "stop listening";
var changeCommand = "change";
var cancelCommand = "cancel";
var activateCommand = "activate";
var deactivateCommand = "deactivate";
var changeCommandQuestion = "which command";
var newCommandQuestion = "which is the new command";
var chooseDistributionCommand = "choose distribution";

var listOperationsCommandES = "listar operaciones";

var readFasterCommand = "faster";
var readFasterCommandES = "más rápido";
var readSlowerCommand = "slower";
var readSlowerCommandES = "más despacio";

var welcomeCommandES = "bienvenida";
var stopListeningCommandES = "parar de escuchar";
var changeCommandES = "cambiar";
var cancelCommandES = "cancelar";
var activateCommandES = "activar";
var deactivateCommandES = "desactivar";
var changeCommandQuestionES = "que comando";
var newCommandQuestionES = "cuál es el nuevo comando?";
var chooseDistributionCommandES = "elegir distribución";

var changeCommandInProcess1 = false;
var changeCommandInProcess2 = false;
var newCommandString = "";

var operationToChange;
var distributionChoosenURL = "";

var readParams = ["description", "distributions", "columns", "first row"];
var readParamsES = ["descripción", "distribuciones", "columnas", "primera fila"];
var goToParams = ["distributions", "description"];
var goToParamsES = ["distribuciones", "descripción"];

/*********************** Page is loaded ************************/
$(document).ready(function() {
    //<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
    /*var meta = document.createElement('meta');
    meta.httpEquiv = "Content-Security-Policy";
    meta.content = "upgrade-insecure-requests";
    document.head.appendChild(meta);*/
    /*var meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy-Report-Only');
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https:; manifest-src 'self'";
    document.head.appendChild(meta);*/
    //<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">

    // Browsers require user interaction for speech synthesis
    var hiddenButton = document.createElement("button");
    hiddenButton.onclick = function(){console.log("User interaction");}
    document.body.appendChild(hiddenButton);
    //hiddenButton.focus();
    hiddenButton.click();
    hiddenButton.style.display = "none";
    //swal("Click OK to speak").then(() => hiddenButton.click());
    /*var firstTimeReadWelcome = function(){
        console.log("Read welcome onmouseover");
        document.body.removeEventListener("mouseover", firstTimeReadWelcome);
        readWelcome();
    }
    document.body.addEventListener("mouseover", firstTimeReadWelcome);*/

    // Detect if domain is spanish or english
    if(document.URL.endsWith("/es") || document.URL.includes("locale=es")){
        spanishDomain = true;
        console.log("spanish domain");
    }

    /*********************** Add new operations here ************************/
    var increaseFontSizeOperation, decreaseFontSizeOperation, readAloudOperation, goToOperation, goBackOperation, breadCrumbOperation;
    if(!spanishDomain){
        increaseFontSizeOperation = new IncreaseFontSizeOperation("increaseFontSizeOperation", "Increase Font Size", "increase font size", true, true, true, false);
        decreaseFontSizeOperation = new DecreaseFontSizeOperation("decreaseFontSizeOperation", "Decrease Font Size", "decrease font size", true, true, true, false);
        readAloudOperation = new ReadAloudOperation("readAloud", "Read Aloud", "read aloud", true, true, true, true);
        goToOperation = new GoToOperation("goTo", "Go To", "go to", true, true, true, true);
        goBackOperation = new GoBackOperation("goBack", "Go Back", "go back", true, true, true, false);
        breadCrumbOperation = new BreadcrumbOperation("breadcrumb", "Breadcrumb", "", true, true, true, false);
    } else {
        increaseFontSizeOperation = new IncreaseFontSizeOperation("increaseFontSizeOperation", "Aumentar Tamaño Letra", "aumentar tamaño letra", true, true, true, false);
        decreaseFontSizeOperation = new DecreaseFontSizeOperation("decreaseFontSizeOperation", "Reducir Tamaño Letra", "reducir tamaño letra", true, true, true, false);
        readAloudOperation = new ReadAloudOperation("readAloud", "Leer en voz alta", "leer", true, true, true, true);
        goToOperation = new GoToOperation("goTo", "Ir a", "ir a", true, true, true, true);
        goBackOperation = new GoBackOperation("goBack", "Volver", "volver", true, true, true, false);
        breadCrumbOperation = new BreadcrumbOperation("breadcrumb", "Panel navegación", "", true, true, true, false);
    }

    checkFocus();
    initWAFRA();
    textToAudio();
    audioToText();

    var wafra = new WAFRA();
    wafra.getAndSetStorage();
    wafra.createWebAugmentedMenu();
    wafra.createOperationsMenu();
    wafra.createCommandsMenu();
    document.onkeydown = KeyPress;

    //TODO: personalise welcome
    /*setTimeout(function(){
        getDistributions();
    }, 1000);*/


});


/**
 * Class WAFRA.
 *
 * @class WAFRA
 */
class WAFRA {

    constructor() {

    }

    getAndSetStorage() {

        if(myStorage.getItem("readerRate") !== null){
            try {
                readerRate = myStorage.getItem("readerRate");
            } catch (e) {
            }
        } else {
            myStorage.setItem("readerRate", readerRate);
        }
        for(var operationsIndex = 0; operationsIndex < operations.length; operationsIndex++){
            // Voice commands names
            if(myStorage.getItem(operations[operationsIndex].id) !== null){
                operations[operationsIndex].voiceCommand = myStorage.getItem(operations[operationsIndex].id);
            } else {
                myStorage.setItem(operations[operationsIndex].id, operations[operationsIndex].voiceCommand);
            }

            // Operations & commands active?
            if(myStorage.getItem(operations[operationsIndex].id + "Active") !== null){
                operations[operationsIndex].active = (myStorage.getItem(operations[operationsIndex].id + "Active") == 'true');
            } else {
                myStorage.setItem(operations[operationsIndex].id + "Active", operations[operationsIndex].active);
            }
        }
    }


    createWebAugmentedMenu(){
        createMenus();
    }

    createOperationsMenu(){
        createOperationsMenu();
    }

    createCommandsMenu(){
        createCommandsMenu();
    }

}

/**
 * Abstract Class Operation.
 *
 * @class Operation
 */
class Operation {

    /*id;
    name;
    voiceCommand;
    activable;
    editable;*/

    constructor() {
        if (this.constructor == Operation) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    configureOperation() {
        throw new Error("Method 'initOperation()' must be implemented.");
    }

    initOperation() {
        throw new Error("Method 'initOperation()' must be implemented.");
    }

    startOperation() {
        throw new Error("Method 'startOperation()' must be implemented.");
    }

    stopOperation() {
        throw new Error("Method 'stopOperation()' must be implemented.");
    }


    initOperation(id, name, voiceCommand, activable, active, editable, hasMenu) {
        this.id = id;
        this.name = name;
        this.voiceCommand = voiceCommand;
        //this.section = section;
        this.activable = activable;
        this.active = active;
        this.editable = editable;
        this.hasMenu = hasMenu;
        operations.push(this);
    }
}


class IncreaseFontSizeOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation(){

    }

    startOperation() {
        var scroll = window.scrollY;
        var totalScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight,
                                   document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);

        var bodyContent = document.getElementsByTagName('div');

        for(var i = 0; i < bodyContent.length; i++) {
            var styleI = window.getComputedStyle(bodyContent[i], null).getPropertyValue('font-size');
            var fontSizeI = parseFloat(styleI);
            bodyContent[i].style.fontSize = (fontSizeI + 2) + 'px';
        }

        var currentTotalScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight,
                                          document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
        var currentScroll = (scroll * currentTotalScroll) / totalScroll;
        window.scrollTo(0, currentScroll);
    }

    stopOperation() {
        console.log("Stop operation");
    }
}


class DecreaseFontSizeOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation(){

    }

    startOperation() {
        var scroll = window.scrollY;
        var totalScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight,
                                   document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);

        var bodyContent = document.getElementsByTagName('div');

        for(var j = 0; j < bodyContent.length; j++) {
            var styleJ = window.getComputedStyle(bodyContent[j], null).getPropertyValue('font-size');
            var fontSizeJ = parseFloat(styleJ);
            bodyContent[j].style.fontSize = (fontSizeJ - 2) + 'px';
        }

        var currentTotalScroll = Math.max(document.body.scrollHeight, document.body.offsetHeight,
                                          document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight);
        var currentScroll = (scroll * currentTotalScroll) / totalScroll;
        window.scrollTo(0, currentScroll);
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

class ReadAloudOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation() {
        createSubmenuForOperationRead("menu-" + this.id, this);
    }

    openMenu() {
        closeOperationsMenu();
        showSubmenu("menu-" + this.id);
    }

    startOperation(params) {
        var parameters = params.currentTarget.params;
        readAloud(parameters);
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

function readAloud(params){

    //TODO: control params (i.e. separate "columns" from distribution name)

    console.log("read: " + params);
    //closeGoToMenu();
    closeMenu();
    closeOperationsMenu();

    var readContent = "";

    //TODO: check array of params and read specific content
    switch(params){
        case "description" || "descripción":
            readContent += getDescriptionText();
            break;
        case "columns" || "columnas":
            getColumnsText(params);
            return;
            break;
        case "distributions" || "distribuciones":
            readContent += getDistributionsText();
            break;
    }

    /*if(!spanishDomain){
        readContent += "Section " + sectionNameToRead + ". " ;
    } else {
        readContent += "Sección " + sectionNameToRead + ". " ;
    }
    if(readFirstTime){
        readFirstTime = false;
        if(!spanishDomain){
            readContent += "You can use control + space to stop the reading aloud operation. ";
        } else {
            readContent += "Puedes utilizar control + espacio para detener la lectura en voz alta. ";
        }
    }
    for(var z = 0; z < items[j].value.length; z++){
        var element = getElementByXPath(items[j].value[z]);
        var domParser = new DOMParser().parseFromString(element.outerHTML, 'text/html');
        readContent += domParser.body.innerText;
        console.log("domParser: " + JSON.stringify(domParser));
        console.log("content: " + readContent);
    }*/
    Read(readContent);
}

class GoToOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation() {
        createSubmenuForOperationGoTo("menu-" + this.id, this);
    }

    openMenu() {
        closeOperationsMenu();
        showSubmenu("menu-" + this.id);
    }

    startOperation(params) {
        var parameters = params.currentTarget.params;
        goTo(parameters);
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

// Go to
function goTo(params){

    console.log("goTo: " + params);
    //closeGoToMenu();
    closeMenu();
    closeOperationsMenu();

    //TODO: for goToParams and go to specific content
    switch(params){
        case "distributions":
            params = "/html/body/div/div/div[2]/div/div[2]/div[3]/div/div/h3";
            break;
    }
    var element = getElementByXPath(params);
    element.scrollIntoView();

}

// Go back
class GoBackOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation() {
    }

    startOperation() {
        goBack();
    }

    stopOperation() {
    }
}

// Go back
function goBack(){
    var breadcrumbChildren = document.getElementById("BreadCrumb").children;
    if(breadcrumbChildren.length > 1){
        breadcrumbChildren[breadcrumbChildren.length-2].firstElementChild.click();
    } else {
        if(!spanishDomain){
            Read("There is no previous page in the history from same web domain");
        } else {
            Read("No hay una página anterior en el historial que pertenezca al mismo dominio");
        }
    }
}

// BreadCrumb
class BreadcrumbOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu);
    }

    configureOperation() {
        breadcrumb();
    }

    startOperation() {

    }

    stopOperation() {
        console.log("Stop operation");
    }
}


/*********************** Add new operations classes here ************************/


// *************************** Helpers ***************************

var hidden, visibilityChange, state;
function checkFocus(){
    // Set the name of the hidden property and the change event for visibility
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
        hidden = "hidden";
        visibilityChange = "visibilitychange";
        state = "visibilityState";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
        state = "mozVisibilityState";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
        state = "msVisibilityState";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
        state = "webkitVisibilityState";
    }

}

function initWAFRA() {
    var link1 = document.createElement('link');
    link1.rel = 'stylesheet';
    link1.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
    document.head.appendChild(link1);
    var link2 = document.createElement('link');
    link1.rel = 'stylesheet';
    link2.href= 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css';
    document.head.appendChild(link2);

    var divMenu = document.createElement("div");
    divMenu.id = "menu-webaugmentation";
    divMenu.style = "position: fixed; right: 2%; top: 2%; z-index: 100; line-height: 140%;";
    var menuLinkDiv = document.createElement("div");
    menuLinkDiv.id = "div-webaugmentation";
    var menuLink = document.createElement("a");
    menuLink.id = "a-webaugmentation";
    menuLink.href = "javascript:void(0);";
    menuLink.className = "icon";
    menuLink.addEventListener("click", toggleMenu);
    var menuIcon = document.createElement("i");
    menuIcon.className = "fa fa-bars fa-2x fa-border";
    menuIcon.style="background-color: white;";
    menuLink.appendChild(menuIcon);
    menuLinkDiv.appendChild(menuLink);
    divMenu.appendChild(menuLinkDiv);
    document.body.appendChild(divMenu);

}


function createMenus(){

    var divButtons = document.createElement('div');
    divButtons.id = "foldingMenu";
    divButtons.style = "padding: 10px; border: 2px solid black; display: none; background-color: white";

    var toggleListeningIcon = document.createElement("i");
    toggleListeningIcon.id = "toggleListeningIcon";
    toggleListeningIcon.className = "fa fa-circle";

    var aToggleListening = document.createElement('a');
    aToggleListening.id = "toggleListeningA";
    aToggleListening.addEventListener("click", function(){
        closeMenu();
        if(recognitionActive){
            console.log("recognition deactivated")
            recognitionActive = false;
            if(!spanishDomain){
                aToggleListening.text = 'Start Listening';
            } else {
                aToggleListening.text = 'Activar comandos por voz';
            }
            toggleListeningIcon.style = "color:red; margin-left: 8px";
            recognition.abort();
        } else{
            console.log("recognition activated")
            recognitionActive = true;
            recognition.start();
            if(!spanishDomain){
                aToggleListening.text = 'Stop Listening';
            } else {
                aToggleListening.text = 'Desactivar comandos por voz';
            }
            //inputVoiceCommands.checked = recognitionActive;
            toggleListeningIcon.style = "color:gray; margin-left: 8px";
        }
        //document.getElementById("voiceCommandsInput").checked = recognitionActive;
        myStorage.setItem("recognitionActive", recognitionActive);
    }, false);
    if(recognitionActive){
        if(!spanishDomain){
            aToggleListening.text = 'Stop Listening';
        } else {
            aToggleListening.text = 'Desactivar comandos por voz';
        }
        toggleListeningIcon.style = "color:gray; margin-left: 8px";
    }
    else{
        if(!spanishDomain){
            aToggleListening.text = 'Start Listening';
        } else {
            aToggleListening.text = 'Activar comandos por voz';
        }
        toggleListeningIcon.style = "color:red; margin-left: 8px";
    }
    divButtons.appendChild(aToggleListening);
    divButtons.appendChild(toggleListeningIcon);
    divButtons.appendChild(document.createElement('br'));

    var a5 = document.createElement('a');
    a5.id = "voiceCommandsA";
    //a5.href = '';
    a5.addEventListener("click", function(){
        toggleMenu();
        toggleCommandsMenu();
        closeAnnotationsMenu();
        closeOperationsMenu();
    }, false);
    if(!spanishDomain){
        a5.text = 'Voice commands';
    } else {
        a5.text = 'Comandos por voz';
    }
    divButtons.appendChild(a5);
    divButtons.appendChild(document.createElement('br'));

    var aOperations = document.createElement('a');
    aOperations.id = "operationsA";
    aOperations.addEventListener("click", toggleOperationsMenu, false);
    if(!spanishDomain){
        aOperations.text = 'Accessibility Operations';
    } else {
        aOperations.text = 'Operaciones de Accesibilidad';
    }
    divButtons.appendChild(aOperations);

    var i = document.createElement('i');
    i.className = 'fa fa-close'
    i.style = "position: absolute; right: 10%; top: 20%; z-index: 100;"
    i.addEventListener("click", closeMenu, false);
    divButtons.appendChild(i);


    document.getElementById("div-webaugmentation").appendChild(divButtons);

}

function createOperationsMenu(){
    var divButtons = document.createElement('div')
    divButtons.id = "menu-operations"
    divButtons.style = "z-index: 100; padding: 10px; border: 2px solid black; display: none; background-color: white"


    var i = document.createElement('i');
    i.className = 'fa fa-close'
    i.style = "position: absolute; right: 1%; top: 31%; z-index: 100;"
    i.addEventListener("click", function(){
        closeOperationsMenu();
    }, false);
    divButtons.appendChild(i);

    for(var operationsIndex = 0; operationsIndex < operations.length; operationsIndex++){
        var a = document.createElement('a');
        a.id = operations[operationsIndex].id;
        //a.href = '';
        a.text = operations[operationsIndex].name;
        operations[operationsIndex].configureOperation();
        if(operations[operationsIndex].hasMenu){
            a.addEventListener("click", operations[operationsIndex].openMenu, false);
        } else {
            a.addEventListener("click", operations[operationsIndex].startOperation, false);
        }
        divButtons.appendChild(a);

        if(operations[operationsIndex].activable){
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.id = operations[operationsIndex].id + "Input";
            input.value = operations[operationsIndex].id + "Input";
            input.checked = operations[operationsIndex].active;
            input.style.setProperty("margin-left", "5px");
            if(operations[operationsIndex].active){
                a.style.setProperty("pointer-events", "all");
            } else {
                a.style.setProperty("pointer-events", "none");
            }

            input.addEventListener("change", function(){
                for(var operationsI = 0; operationsI < operations.length; operationsI++){
                    if(operations[operationsI].id === this.id.split("Input").join("")){
                        if(!this.checked){
                            operations[operationsI].active = false;
                            myStorage.setItem(operations[operationsI].id + "Active", operations[operationsI].active);
                            document.getElementById(operations[operationsI].id).style.setProperty("pointer-events", "none");
                        } else {
                            operations[operationsI].active = true;
                            myStorage.setItem(operations[operationsI].id + "Active", operations[operationsI].active);
                            document.getElementById(operations[operationsI].id).style.setProperty("pointer-events", "all");
                        }

                        if(this.id.split("Input").join("") === "readAloud"){
                            toggleReadAloud();
                        } else if(this.id.split("Input").join("") === "breadcrumb"){
                            toggleBreadcrumb();
                        }
                    }
                }
            }, false);
            divButtons.appendChild(input);
        }
        divButtons.appendChild(document.createElement('br'));
    }
    document.getElementById("div-webaugmentation").appendChild(divButtons);

    /*  createReadMenu();
        createGoToMenu();*/
    //readWelcome();
    setTimeout(function() { say(); }, 1000);


    toggleReadAloud();
    toggleBreadcrumb();
}


function say() {
    //speechSynthesis.speak(new SpeechSynthesisUtterance(txt));
    readWelcome();
}


function createCommandsMenu(){
    var divCommandsMenu = document.createElement("div")
    divCommandsMenu.id = "menu-commands";
    divCommandsMenu.style = "z-index: 100; padding: 10px; border: 2px solid black; display: none; background-color: white"

    var i = document.createElement('i');
    i.className = 'fa fa-close'
    i.style = "position: absolute; right: 1%; top: 31%; z-index: 100;"
    i.addEventListener("click", function(){
        closeCommandsMenu();
    }, false);
    divCommandsMenu.appendChild(i);

    for(var index = 0; index < operations.length; index++){
        var a1 = document.createElement('a');
        a1.id = operations[index].id + "Edit";
        if(!spanishDomain){
            a1.text = "'" + operations[index].name + "' command (" + operations[index].voiceCommand + ") ";
        } else {
            a1.text = "Comando '" + operations[index].name + "' (" + operations[index].voiceCommand + ") ";
        }
        a1.addEventListener("click", function(){
            for(var index = 0; index < operations.length; index++){
                if(operations[index].id === this.id.split("Edit").join("")){
                    var result;
                    if(!spanishDomain){
                        result = prompt("New command value for '" + operations[index].name + "' command (must be recognisable by voice)", operations[index].voiceCommand);;
                    } else {
                        result = prompt("Nuevo comando para '" + operations[index].name + "' (tiene que ser reconocible por voz)", operations[index].voiceCommand);;
                    }
                    if(result !== null){
                        operations[index].voiceCommand = result.toLowerCase();
                        myStorage.setItem(operations[index].id, result.toLowerCase());
                        console.log(result);
                    }
                }
            }
        }, false);
        var a1i = document.createElement('i');
        a1i.className = 'fa fa-edit'
        a1.appendChild(a1i);
        divCommandsMenu.appendChild(a1);
        divCommandsMenu.appendChild(document.createElement('br'));
    }

    document.getElementById("div-webaugmentation").appendChild(divCommandsMenu);
}


function createSubmenuForOperationRead(menuId, operationForSubmenu){

    var divSubMenu = document.createElement("div");
    divSubMenu.id = menuId;
    divSubMenu.style = "z-index: 100; padding: 10px; border: 2px solid black; display: none; background-color: white";

    var i = document.createElement('i');
    i.className = 'fa fa-close';
    i.style = "position: absolute; right: 1%; top: 31%; z-index: 100;";
    i.addEventListener("click", closeSubmenu, false);
    i.menuId = menuId;
    divSubMenu.appendChild(i);

    try{
        var a1 = document.createElement('a');
        if(!spanishDomain){
            a1.text = "columns";
            a1.params = "columns";
        } else {
            a1.text = "columnas";
            a1.params = "columnas";
        }
        a1.addEventListener("click", operationForSubmenu.startOperation, false);
        a1.operation = operationForSubmenu;
        divSubMenu.appendChild(a1);
        divSubMenu.appendChild(document.createElement('br'));
    } catch(e){}

    document.getElementById("div-webaugmentation").appendChild(divSubMenu);
}


function createSubmenuForOperationGoTo(menuId, operationForSubmenu){

    var divSubMenu = document.createElement("div");
    divSubMenu.id = menuId;
    divSubMenu.style = "z-index: 100; padding: 10px; border: 2px solid black; display: none; background-color: white";

    var i = document.createElement('i');
    i.className = 'fa fa-close';
    i.style = "position: absolute; right: 1%; top: 31%; z-index: 100;";
    i.addEventListener("click", closeSubmenu, false);
    i.menuId = menuId;
    divSubMenu.appendChild(i);

    try{
        var a1 = document.createElement('a');
        if(!spanishDomain){
            a1.text = "distributions";
            a1.params = "distributions";
        } else {
            a1.text = "distribuciones";
            a1.params = "distribuciones";
        }
        a1.addEventListener("click", operationForSubmenu.startOperation, false);
        a1.operation = operationForSubmenu;
        divSubMenu.appendChild(a1);
        divSubMenu.appendChild(document.createElement('br'));
    } catch(e){}

    document.getElementById("div-webaugmentation").appendChild(divSubMenu);
}

function showSubmenu(id){
    var divSubMenu = document.getElementById(id);
    if(divSubMenu !== null){
        var x = divSubMenu.style;
        x.display = "block";
    }
}

function closeSubmenu(menuId){
    var menuIdToClose = menuId;
    if(typeof menuId.parentElement === 'undefined' && typeof menuId.currentTarget !== 'undefined'){
        menuIdToClose = menuId.currentTarget.menuId
    }
    var divSubMenu = document.getElementById(menuIdToClose);
    if(divSubMenu !== null){
        var x = divSubMenu.style;
        x.display = "none";
    }
}


function readWelcome(){
    var readContent = "";
    if(!spanishDomain){
        readContent = "Welcome to " + document.title + "! The voice commands available are: ";
        for(var i = 0; i < operations.length; i++){
            readContent += operations[i].voiceCommand + ", ";
        }
        readContent += listOperationsCommand + ", " + welcomeCommand + ", " + stopListeningCommand + ", " + chooseDistributionCommand + ", " + changeCommand + ", "
            + activateCommand + ", " + deactivateCommand + ", " + readFasterCommand + ", " + readSlowerCommand + ". ";
        readContent += "The sections to read aloud are: " + readParams.toString() + ". And the sections to go directly are: " + goToParams.toString() + ".";
    } else {
        readContent = "¡Bienvenido a " + document.title + "! Los comandos de voz disponibles son: ";
        for(var j = 0; j < operations.length; j++){
            readContent += operations[j].voiceCommand + ", ";
        }
        readContent += listOperationsCommandES + ", " + welcomeCommandES + ", " + stopListeningCommandES + ", " + chooseDistributionCommandES + ", " + changeCommandES + ", "
            + activateCommandES + ", " + deactivateCommandES + ", " + readFasterCommandES + ", " + readSlowerCommandES + ". ";
        readContent += "Las secciones para leer en voz alta son: " + readParamsES.toString() + ". Y las secciones para ir directamente son: " + goToParamsES.toString() + ".";
    }

    Read(readContent);
}

function readOperations(){
    var readContent = "";
    if(!spanishDomain){
        readContent = "The voice commands available are: ";
        for(var i = 0; i < operations.length; i++){
            readContent += operations[i].voiceCommand + ", ";
        }
        readContent += listOperationsCommand + ", " + welcomeCommand + ", " + stopListeningCommand + ", " + chooseDistributionCommand + ", " + changeCommand + ", "
            + activateCommand + ", " + deactivateCommand + ", " + readFasterCommand + ", " + readSlowerCommand + ". ";
        readContent += "The sections to read aloud are: " + readParams.toString() + ". And the sections to go directly are: " + goToParams.toString() + ".";
    } else {
        readContent = "Los comandos de voz disponibles son: ";
        for(var j = 0; j < operations.length; j++){
            readContent += operations[j].voiceCommand + ", ";
        }
        readContent += listOperationsCommandES + ", " + welcomeCommandES + ", " + stopListeningCommandES + ", " + chooseDistributionCommandES + ", " + changeCommandES + ", "
            + activateCommandES + ", " + deactivateCommandES + ", " + readFasterCommandES + ", " + readSlowerCommandES + ". ";
        readContent += "Las secciones para leer en voz alta son: " + readParamsES.toString() + ". Y las secciones para ir directamente son: " + goToParamsES.toString() + ".";
    }
    Read(readContent);
}

function textToAudio(){
    createPlayButtons();

    var cancelfooter = document.createElement('div');
    cancelfooter.id = "cancel";
    var buttonStop = document.createElement('button');
    if(!spanishDomain){
        buttonStop.innerText = "Stop";
    } else {
        buttonStop.innerText = "Detener";
    }
    buttonStop.addEventListener('click', stopReading);
    buttonStop.style.height = "50px";
    buttonStop.style.fontSize = "25px";
    cancelfooter.appendChild(buttonStop);
    document.body.appendChild(cancelfooter);
    $('#cancel').css({
        'position': 'fixed',
        'left': '0',
        'bottom': '0',
        'width': '100%',
        'background-color': 'black',
        'color': 'white',
        'text-align': 'center',
        'visibility': 'hidden',
    });
}

function createPlayButtons(){
    $('p').each(function() {
        if($(this).parent().attr('role') != 'navigation'){
            var button = document.createElement('button');
            button.innerHTML = "&#9658;";
            button.value = $(this).prop('innerText');
            button.className = "readAloudButton";
            button.style.fontSize = "18px";
            button.addEventListener('click', function(){
                Read($(this).prop('value'));
            });
            $(this).append(button);
        }
    });
}

function toggleReadAloud(){
    var divsToHide = document.getElementsByClassName("readAloudButton");
    var readCommandActive;
    if(!document.getElementById("readAloudInput").checked){
        readCommandActive = false;
        document.getElementById("readAloud").style.setProperty("pointer-events", "none");
        for(var i = 0; i < divsToHide.length; i++){
            divsToHide[i].style.display = "none";
        }
    } else {
        readCommandActive = true;
        document.getElementById("readAloud").style.setProperty("pointer-events", "all");
        for(var i2 = 0; i2 < divsToHide.length; i2++){
            divsToHide[i2].style.display = "block";
        }
    }
    myStorage.setItem("readAloudActive", readCommandActive);
}

function resumeInfinity() {
    reading = true;
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    timeoutResumeInfinity = setTimeout(resumeInfinity, 10000);
    $('#cancel').css('visibility', 'visible');
}

function Read(message){
    console.log("Read function: " + message)
    window.speechSynthesis.cancel();
    clearTimeout(timeoutResumeInfinity);

    if(!document[hidden]){

        var reader = new SpeechSynthesisUtterance(message);
        reader.rate = readerRate;
        if(!spanishDomain){
            reader.lang = languageCodeSyntesis;
        } else {
            reader.lang = languageCodeSyntesisES;
        }
        reader.onstart = function(event) {
            resumeInfinity();
        };
        reader.onend = function(event) {
            clearTimeout(timeoutResumeInfinity);
            $('#cancel').css('visibility', 'hidden');
            setTimeout(function(){
                reading = false;
                if(recognitionActive){
                    recognition.start();
                }
            }, 1000);
        };

        try{
            reading = true;
            if(recognitionActive){
                recognition.abort();
            }
            window.speechSynthesis.speak(reader);
        } catch(e){
            stopReading();
        }
        if(window.speechSynthesis.speaking){
            $('#cancel').css('visibility', 'visible');
        } else {
            stopReading();
        }

    } else {
        console.log("Window tab is not focused, reading aloud not allowed");
    }
}

function readFaster(){
    //console.log(readerRate);
    //readerRate = parseFloat(readerRate);
    if(readerRate <= 9){
        readerRate = readerRate + 0.5;
        myStorage.setItem("readerRate", readerRate);

        if(!spanishDomain){
            Read("Read speed " + readerRate + " out of 10.");
        } else {
            Read("Velocidad de lectura " + readerRate + " sobre 10.");
        }
    } else {
        if(!spanishDomain){
            Read("Read speed at maximum level.")
        } else {
            Read("Velocidad de lectura al máximo.")
        }
    }
}

function readSlower(){
    //console.log(readerRate);
    //readerRate = parseFloat(readerRate);
    if(readerRate > 0.5){
        readerRate = readerRate - 0.5;
        myStorage.setItem("readerRate", readerRate);

        if(!spanishDomain){
            Read("Read speed " + readerRate + " out of 10.");
        } else {
            Read("Velocidad de lectura " + readerRate + " sobre 10.");
        }
    } else {
        if(!spanishDomain){
            Read("Read speed at minimum level.")
        } else {
            Read("Velocidad de lectura al mínimo.")
        }
    }
}

function stopReading(){
    window.speechSynthesis.cancel();
    clearTimeout(timeoutResumeInfinity);
    $('#cancel').css('visibility', 'hidden');

    setTimeout(function(){
        reading = false;

        if(recognitionActive){
            recognition.start();
        }
    }, 1000);
}

function KeyPress(e) {
    var evtobj = window.event? event : e

    // No mic tests
    /*if(evtobj.ctrlKey && evtobj.shiftKey){
        console.log("No mic tests");
        readSectionsText();
    }*/
    if(evtobj.keyCode == 32 && evtobj.ctrlKey && evtobj.shiftKey){
        //TODO: quitar pruebas
        /*distributionChoosenURL="http://www.bne.es/media/datosgob/awe/evento/coronavirus-utf8.csv";
        getColumnsText();*/
        if(!reading){
            readWelcome();
        }
    }
    else if (evtobj.keyCode == 32 && evtobj.ctrlKey){
        if(reading){
            stopReading();
        }
        else if(!recognitionActive){
            recognitionActive = true;
            recognition.start();
            var aToggleListening = document.getElementById("toggleListeningA");
            if(!spanishDomain){
                aToggleListening.text = 'Stop Listening';
            } else {
                aToggleListening.text = 'Desactivar comandos por voz';
            }
            //var inputVoiceCommands = document.getElementById("voiceCommandsInput");
            //inputVoiceCommands.checked = recognitionActive;
            var toggleListeningIcon = document.getElementById("toggleListeningIcon");
            toggleListeningIcon.style = "color:gray; margin-left: 8px";
            if(!spanishDomain){
                Read("Listening active, to stop listening use the " + stopListeningCommand + " voice command, which disables all voice commands.");
            } else {
                Read("Comandos por voz activos, para desactivarlos use el comando " + stopListeningCommand + ".");
            }
        }
        else {
            recognitionActive = false;
            recognition.abort();
            var aToggleListening2 = document.getElementById("toggleListeningA");
            if(!spanishDomain){
                aToggleListening2.text = 'Start Listening';
            } else {
                aToggleListening2.text = 'Activar comandos por voz';
            }
            //var inputVoiceCommands2 = document.getElementById("voiceCommandsInput");
            //inputVoiceCommands2.checked = recognitionActive;
            var toggleListeningIcon2 = document.getElementById("toggleListeningIcon");
            toggleListeningIcon2.style = "color:red; margin-left: 8px";
            if(!spanishDomain){
                Read("Listening stop, to start listening use the control and space keys, which enables all voice commands.");
            } else {
                Read("Comandos por voz desactivados, para activarlos use el comando " + stopListeningCommand + ".");
            }
        }

        myStorage.setItem("recognitionActive", recognitionActive);
    }
}

var commandListened;

// Speech recognition
function audioToText(){
    //headlines = document.getElementsByClassName("mw-headline")
    //sectionsNames = JSON.parse(myStorage.getItem(localStoragePrefix + "sectionsNames"));

    console.log("Configure speech recognition");

    updateGrammar();
    if(!spanishDomain){
        recognition.lang = languageCodeCommands;
    } else {
        recognition.lang = languageCodeCommandsES;
    }
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = event => {
        if(reading === false) {
            const speechToText = event.results[event.results.length -1][0].transcript.toLowerCase().trim();
            commandListened = speechToText;
            console.log(speechToText);
            if(!changeCommandInProcess1 && !changeCommandInProcess2){
                if(speechToText.includes(listOperationsCommand) || speechToText.includes(listOperationsCommandES)){
                    readOperations();
                }
                else if(speechToText.includes(welcomeCommand) || speechToText.includes(welcomeCommandES)){
                    readWelcome();
                }
                else if(speechToText.includes(readFasterCommand) || speechToText.includes(readFasterCommandES)){
                    readFaster();
                }
                else if(speechToText.includes(readSlowerCommand) || speechToText.includes(readSlowerCommandES)){
                    readSlower();
                }
                else if(speechToText.includes(chooseDistributionCommand) || speechToText.includes(chooseDistributionCommandES)){
                    chooseDistribution(speechToText.replaceAll(chooseDistributionCommand, "").replaceAll(chooseDistributionCommandES, ""));
                }
                else if((speechToText.includes(activateCommand) && !speechToText.includes(deactivateCommand)) ||
                       (speechToText.includes(activateCommandES) && !speechToText.includes(deactivateCommandES))){
                    console.log("Activate operation: ");
                    for(var a = 0; a < operations.length; a++){
                        if((speechToText.includes(activateCommand + " " + operations[a].voiceCommand) ||
                            speechToText.includes(activateCommandES + " " + operations[a].voiceCommand)) && !operations[a].active){
                            console.log(operations[a].name);
                            var input = document.getElementById(operations[a].id + "Input");
                            input.checked = true;
                            var eventChange = new Event('change');
                            input.dispatchEvent(eventChange);
                            if(!spanishDomain){
                                Read("Operation " + operations[a].voiceCommand + " activated.");
                            } else {
                                Read("Operación " + operations[a].voiceCommand + " activada.");
                            }
                        }
                    }
                }
                else if(speechToText.includes(deactivateCommand) || speechToText.includes(deactivateCommandES)){
                    console.log("Deactivate operation: ");
                    for(var b = 0; b < operations.length; b++){
                        if((speechToText.includes(deactivateCommand + " " + operations[b].voiceCommand) ||
                            speechToText.includes(deactivateCommandES + " " + operations[b].voiceCommand)) && operations[b].active){
                            console.log(operations[b].name);
                            var input2 = document.getElementById(operations[b].id + "Input");
                            input2.checked = false;
                            var eventChange2 = new Event('change');
                            input2.dispatchEvent(eventChange2);
                            if(!spanishDomain){
                                Read("Operation " + operations[b].voiceCommand + " deactivated.");
                            } else {
                                Read("Operación " + operations[b].voiceCommand + " desactivada.");
                            }
                        }
                    }
                }
                else if(speechToText.includes(changeCommand) || speechToText.includes(changeCommandES)){
                    console.log("changeCommandInProcess = true")
                    changeCommandInProcess1 = true;
                    if(!spanishDomain){
                        Read(changeCommandQuestion + "?");
                    } else {
                        Read(changeCommandQuestionES + "?");
                    }
                }
                else if(speechToText.includes(stopListeningCommand) || speechToText.includes(stopListeningCommandES)){
                    if(recognitionActive){
                        console.log("recognition deactivated")
                        recognitionActive = false;
                        recognition.abort();
                    }
                    if(!spanishDomain){
                        document.getElementById("toggleListeningA").text = "Start Listening";
                        document.getElementById("toggleListeningIcon").style = "color:red";
                        Read("Listening stopped, to start listening use control and space keys.");
                    } else {
                        document.getElementById("toggleListeningA").text = "Activar comandos por voz";
                        document.getElementById("toggleListeningIcon").style = "color:red";
                        Read("Comandos desactivados, para activar comandos por voz use las teclas control más espacio.");
                    }
                } else {
                    for(var i = 0; i < operations.length; i++){
                        if(speechToText.startsWith(operations[i].voiceCommand) && operations[i].voiceCommand.length > 0){
                            if(operations[i].active){
                                try{
                                    var cleanSpeechText = speechToText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase();
                                    if(cleanSpeechText.includes(operations[i].voiceCommand)){
                                        var params = {};
                                        var current = {};
                                        params.currentTarget = current;
                                        params.currentTarget.params = cleanSpeechText.replaceAll(operations[i].voiceCommand, "");
                                        params.currentTarget.operation = operations[i];
                                        operations[i].startOperation(params);
                                        return;
                                    } else {
                                        operations[i].startOperation();
                                        return;
                                    }
                                }catch(e){}
                            } else {
                                if(!spanishDomain){
                                    Read("Operation " + operations[i].voiceCommand + " is not activated, please activate using the voice command: " + activateCommand + " " + operations[i].voiceCommand + ".");
                                } else {
                                    Read("Operación " + operations[i].voiceCommand + " está desactivada, por favor actívala usando el comando de voz: " + activateCommandES + " " + operations[i].voiceCommand + ".");
                                }
                                return;
                            }
                        }
                    }
                    if(recognitionFailedFirstTime){
                        recognitionFailedFirstTime = false;
                        if(!spanishDomain){
                            Read(recognitionFailedText + " You can use: " + listOperationsCommand + " to know which operations are available and which sections can be read aloud.");
                        } else {
                            Read(recognitionFailedTextES + " Puedes usar: " + listOperationsCommandES + " para saber que operaciones están disponibles y qué secciones se pueden leer en voz alta.");
                        }
                    } else {
                        if(!spanishDomain){
                            Read(recognitionFailedText);
                        } else {
                            Read(recognitionFailedTextES);
                        }
                    }
                }
            } else {
                if(changeCommandInProcess1){
                    //Command change in process
                    if(!speechToText.includes(changeCommandQuestion) && !speechToText.includes(newCommandQuestion) &&
                       !speechToText.includes(changeCommandQuestionES) && !speechToText.includes(newCommandQuestionES)){
                        if(speechToText.toLowerCase() == cancelCommand || speechToText.toLowerCase() == cancelCommandES) {
                            console.log("Cancel change of command")
                            changeCommandInProcess1 = false;
                            changeCommandInProcess2 = false;
                            return;
                        }
                        for(var opIndex = 0; opIndex < operations.length; opIndex++){
                            if(speechToText.includes(operations[opIndex].voiceCommand)){

                                if(!spanishDomain){
                                    Read(newCommandQuestion + "?");
                                } else {
                                    Read(newCommandQuestionES + "");
                                }
                                newCommandString = speechToText.toLowerCase();
                                operationToChange = operations[opIndex];
                                changeCommandInProcess1 = false;
                                changeCommandInProcess2 = true;
                                return;
                            }
                        }

                        if(!spanishDomain){
                            Read(speechToText + " is not an existing command. Try again.");
                        } else {
                            Read(speechToText + " no es un comando. Inténtelo de nuevo.");
                        }
                    }
                } else if(changeCommandInProcess2){
                    //Command change in process
                    if(!speechToText.includes(changeCommandQuestion) && !speechToText.includes(newCommandQuestion) &&
                      !speechToText.includes(changeCommandQuestionES) && !speechToText.includes(newCommandQuestionES)){
                        if(speechToText.toLowerCase() == cancelCommand) {
                            console.log("Cancel change of command")
                            changeCommandInProcess1 = false;
                            changeCommandInProcess2 = false;
                        } else {
                            if(!spanishDomain){
                                Read(speechToText + " is the new command");
                            } else {
                                Read(speechToText + " es el nuevo comando");
                            }
                            myStorage.setItem(operationToChange.id, speechToText.toLowerCase());
                            operationToChange.voiceCommand = speechToText.toLowerCase();
                            //console.log("new variable value " + eval(camelize(newCommandString) + "Command"))
                            changeCommandInProcess1 = false;
                            changeCommandInProcess2 = false;
                        }
                    }
                }
            }
        }
    }

    recognition.onspeechend = function() {
        console.log("onspeechend");
        /*setTimeout(function(){
            if(recognitionActive && !reading){
                console.log("recognition reset");
                recognition.start();
            }
        }, 1000);*/
    }

    recognition.onend = function() {
        console.log("onend");
        recognition.stop();
        setTimeout(function(){
            if(recognitionActive && !reading){
                console.log("recognition reset");
                recognition.start();
            }
        }, 100);
    }

    recognition.onerror = function(event) {
        console.log("onerror");
        console.log('Speech recognition error detected: ' + event.error);
        event.preventDefault();
        return false;
    }

    recognition.onstart = function() {
        console.log("onstart");
    }

    if(myStorage.getItem("recognitionActive") !== null){
        recognitionActive = (myStorage.getItem("recognitionActive") == 'true')
    } else {
        myStorage.setItem("recognitionActive", recognitionActive);
    }

    if(document[hidden]){
        recognitionActive = false;
        //myStorage.setItem("recognitionActive", recognitionActive);

        console.log("Window tab is not focused, listening not allowed");
    }

    //setInterval(function(){
        if(recognitionActive && !reading){
            try{
                recognitionActive = true;
                recognition.start();
                console.log("recognition activated")
            } catch(e){

            }
        }
    //}, 1000);
}


function updateGrammar(){

    var commandsGrammar, commandsAux = [], grammar;
    if(!spanishDomain){
        commandsGrammar = [ 'increase', 'magnify', 'read', 'play', 'font', 'size', 'decrease', 'reduce', 'stop', 'listening', 'faster', 'slower' ];
        commandsAux = [];
        for(var i = 0; i < operations.length; i++){
            //TODO: add operation + params names to grammar
            /*if(operations[i].voiceCommand === "read" || operations[i].voiceCommand === "go to"){
            for(var j = 0; j < sectionsNames.length; j++){
                commandsAux.push(operations[i] + " " + sectionsNames[j].toLowerCase())
            }
        } else {*/
            commandsAux.push(operations[i].voiceCommand)
            //}
        }
        commandsAux.push(readParams);
        commandsAux.push(goToParams);
    } else {
        commandsGrammar = [ 'aumentar', 'incrementar', 'leer', 'play', 'letra', 'tamaño', 'decrementar', 'reducir', 'detener', 'activar', 'desactivar', 'más', 'rápido', 'despacio' ];
        commandsAux = [];
        for(var j = 0; j < operations.length; j++){
            //TODO: add operation + params names to grammar
            /*if(operations[i].voiceCommand === "read" || operations[i].voiceCommand === "go to"){
            for(var j = 0; j < sectionsNames.length; j++){
                commandsAux.push(operations[i] + " " + sectionsNames[j].toLowerCase())
            }
        } else {*/
            commandsAux.push(operations[j].voiceCommand)
            //}
        }
        commandsAux.push(readParamsES);
        commandsAux.push(goToParamsES);
    }

    grammar = '#JSGF V1.0; grammar commands; public <command> = ' + commandsGrammar.concat(commandsAux).join(' | ') + ' ;';
    console.log("grammar: " + grammar);
    var speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
}


function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}


// Bread Crumb (History)
function breadcrumb(){
    var lastVisitedSitesURL = []
    var lastVisitedSitesTitle = []
    var breadcrumb = document.createElement('ol');
    breadcrumb.id = "BreadCrumb";
    breadcrumb.setAttribute('vocab',"https://schema.org/");
    breadcrumb.setAttribute('typeof',"BreadcrumbList");

    var maxBreadCrumb = 4;
    if(myStorage.getItem("lastVisitedSitesTitle0") !== document.title){
        lastVisitedSitesURL.push(location.href)
        lastVisitedSitesTitle.push(document.title)
    } else{
        maxBreadCrumb++;
    }
    for(var i = 0; i < maxBreadCrumb; i++){
        if(myStorage.getItem("lastVisitedSitesURL" + i) !== null){
            lastVisitedSitesURL.push(myStorage.getItem("lastVisitedSitesURL" + i))
        }
        if(myStorage.getItem("lastVisitedSitesTitle" + i) !== null){
            lastVisitedSitesTitle.push(myStorage.getItem("lastVisitedSitesTitle" + i))
        }
    }
    for(var lastVisitedSitesIndex = 0; lastVisitedSitesIndex < lastVisitedSitesURL.length; lastVisitedSitesIndex++){
        myStorage.setItem("lastVisitedSitesURL" + lastVisitedSitesIndex, lastVisitedSitesURL[lastVisitedSitesIndex])
        myStorage.setItem("lastVisitedSitesTitle" + lastVisitedSitesIndex, lastVisitedSitesTitle[lastVisitedSitesIndex])
    }
    document.body.appendChild(breadcrumb);
    $('#BreadCrumb').css({
        'position': 'fixed',
        'height': '50px',
        'left': '15%',
        'top': '0',
        //'width': '100%',
        'padding': '10px',
        'background-color': '#FFFFFF',
        'vertical-align': 'bottom',
        'visibility': 'visible',
        'border': 'solid black',
        'z-index': '100'
    });
    var lastVisitedSitesURLReverse = lastVisitedSitesURL.reverse()
    var lastVisitedSitesTitleReverse = lastVisitedSitesTitle.reverse()
    for(var x = 0; x < lastVisitedSitesURLReverse.length; x++){
        var li = document.createElement("li");
        li.setAttribute('property',"itemListElement");
        li.setAttribute('typeof',"ListItem");
        li.style.display = "inline";

        var link = document.createElement("a");
        if(x < lastVisitedSitesURLReverse.length - 1) {
            link.href = lastVisitedSitesURLReverse[x];
            link.style = "color: #0645ad !important;"
        } else {
            link.style = "color: #000000 !important;text-decoration: none;"
        }
        link.setAttribute('property',"item");
        link.setAttribute('typeof',"WebPage");
        link.className = "linkBread";
        var span = document.createElement("span");
        span.setAttribute('property',"name");
        span.innerText = lastVisitedSitesTitleReverse[x];
        var meta = document.createElement("meta");
        meta.setAttribute('property',"position");
        var position = x+1;
        meta.setAttribute('content',position+"");
        link.appendChild(span);
        li.appendChild(link);
        li.appendChild(meta);
        breadcrumb.appendChild(li);
        breadcrumb.innerHTML += " > ";
    }
    $('.linkBread').each(function(){
        $(this).css({
            'padding':'3px',
        });
    });

    //toggleBreadcrumb()
}


function toggleBreadcrumb(){
    var breadcrumbCommandActive;
    if(document.getElementById("breadcrumbInput").checked){
        breadcrumbCommandActive = true;
        document.getElementById("BreadCrumb").style.setProperty("display", "block");
    } else {
        breadcrumbCommandActive = false;
        document.getElementById("BreadCrumb").style.setProperty("display", "none");
    }
    myStorage.setItem("breadcrumbActive", breadcrumbCommandActive);
}

function toggleMenu(){
    var x = document.getElementById("foldingMenu");
    if(x !== null){
        if (x.style.display === "block") {
            x.style.display = "none";
        } else {
            x.style.display = "block";
        }
        closeCommandsMenu();
        closeAnnotationsMenu();
        closeOperationsMenu();
    }
}
function closeMenu(){
    var x = document.getElementById("foldingMenu");
    if(x !== null){
        x.style.display = "none";
    }
}

function toggleOperationsMenu(){
    var x = document.getElementById("menu-operations");
    if(x !== null){
        if (x.style.display === "block") {
            x.style.display = "none";
        } else {
            x.style.display = "block";
            closeMenu();
        }
    }
}
function closeOperationsMenu(){
    var x = document.getElementById("menu-operations");
    if(x !== null){
        x.style.display = "none";
    }
}

function toggleCommandsMenu(){
    var x = document.getElementById("menu-commands");
    if(x !== null){
        if (x.style.display === "block") {
            x.style.display = "none";
        } else {
            x.style.display = "block";
        }
    }
}
function closeCommandsMenu(){
    var x = document.getElementById("menu-commands");
    if(x !== null){
        x.style.display = "none";
    }
}

function getXPathForElement(element) {
    const idx = (sib, name) => sib
        ? idx(sib.previousElementSibling, name||sib.localName) + (sib.localName == name)
        : 1;
    const segs = elm => !elm || elm.nodeType !== 1
        ? ['']
        : elm.id && document.getElementById(elm.id) === elm
            ? [`id("${elm.id}")`]
            : [...segs(elm.parentNode), `${elm.localName.toLowerCase()}[${idx(elm)}]`];
    return segs(element).join('/').split('"').join("'");
}

function getElementByXPath(path) {
    return (new XPathEvaluator())
        .evaluate(path, document.documentElement, null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
}

/*function parseCSVLine(text) {
  return text.match( /\s*(\".*?\"|'.*?'|[^,]+)\s*(,|$)/g ).map( function (text) {
    let m;
    if (m = text.match(/^\s*\"(.*?)\"\s*,?$/)) return m[1]; // Double Quoted Text
    if (m = text.match(/^\s*'(.*?)'\s*,?$/)) return m[1]; // Single Quoted Text
    if (m = text.match(/^\s*(true|false)\s*,?$/)) return m[1] === "true"; // Boolean
    if (m = text.match(/^\s*((?:\+|\-)?\d+)\s*,?$/)) return parseInt(m[1]); // Integer Number
    if (m = text.match(/^\s*((?:\+|\-)?\d*\.\d*)\s*,?$/)) return parseFloat(m[1]); // Floating Number
    if (m = text.match(/^\s*(.*?)\s*,?$/)) return m[1]; // Unquoted Text
    return text;
  } );
}*/


function getDescriptionText(){
    var text = "";
    var descriptionElement = getElementByXPath("/html/body/div/div/div[2]/div/div[2]/div[1]/div/div/p");
    text = descriptionElement.textContent;
    return text;
}

function getDistributionsText(){
    console.log("getDistributionsText");
    var distributionItems = document.getElementsByClassName("distributions__item");

    var text = "";

    if(!spanishDomain){
        text+="The distributions available are: ";
    } else {
        text+="Las distribuciones disponibles son: ";
    }

    var format = "";
    for(var i = 0; i < distributionItems.length; i++){
        format = distributionItems[i].firstElementChild.firstElementChild.firstElementChild.getAttribute("type");
        if(format === "CSV"){
            var distributionNumber = i+1;
            text+= distributionNumber + ", " + distributionItems[i].firstElementChild.lastElementChild.firstElementChild.firstElementChild.firstElementChild.textContent;
            if(!spanishDomain){
                text+=" in " + format + " format; ";
            } else {
                text+=" en formato " + format + "; ";
            }
        }
    }

    return text;
}

function getDistributions(){
    console.log("getDistributions");
    var distributionItems = document.getElementsByClassName("distributions__item");

    for(var i = 0; i < distributionItems.length; i++){
        if(distributionItems[i].firstElementChild.firstElementChild.firstElementChild.getAttribute("type") === "CSV"){
            console.log(distributionItems[i].firstElementChild.lastElementChild.firstElementChild.firstElementChild.firstElementChild.textContent);
            console.log(distributionItems[i].firstElementChild.lastElementChild.firstElementChild.lastElementChild.lastElementChild.lastElementChild.firstElementChild.firstElementChild.href);
            readCSVFromDistribution(distributionItems[i].firstElementChild.lastElementChild.firstElementChild.lastElementChild.lastElementChild.lastElementChild.firstElementChild.firstElementChild.href);
        }
    }
}

function chooseDistribution(number){
    console.log("chooseDistribution: " + number);

    if(number !== "" && number >= 1){
        distributionChoosenURL = document.getElementsByClassName("distributions__item")[number-1].firstElementChild.lastElementChild.firstElementChild.lastElementChild.lastElementChild.lastElementChild.firstElementChild.firstElementChild.href;
    }

}

function getColumnsText(){

    console.log("getColumnsText: " + distributionChoosenURL);
    if(distributionChoosenURL !== ""){
        /*var xhr = new XMLHttpRequest();
        // Using https://cors-anywhere.herokuapp.com/ allows us to download http (insecure) datasets from https pages
        xhr.open("GET", "https://cors-anywhere.herokuapp.com/" + distributionChoosenURL, true);
        //xhr.setRequestHeader("Origin", '*');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onreadystatechange = function() {
            //console.log(JSON.stringify(xhr));
            //TODO return or read columns
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    //console.log(xhr.responseText);

                    var columns = "";
                    //var firstRow = parseCSVLine(xhr.responseText.split("\n")[0]);
                    var firstRow = xhr.responseText.split("\n")[0];
                    console.log(firstRow);
                    var options={"separator" : ";", "delimiter" : ""};
                    //var firstRowArray = $.csv.toArray(firstRow, options);
                    if(firstRow.length > 0){
                        if(!spanishDomain){
                            columns = "The columns available are: ";
                        } else {
                            columns = "Las columnas disponibles son: ";
                        }

                        for(var i = 0; i < firstRow.length; i++){
                            columns += firstRow[i].replaceAll(",","").replaceAll(";","") + ", ";
                        }
                    } else {
                        if(!spanishDomain){
                            columns = "There cannot be found any columns.";
                        } else {
                            columns = "No se ha podido encontrar ninguna columna.";
                        }
                    }
                    console.log(columns);
                    Read(columns);
                }
            }
        }
        xhr.send();*/

        var firstRow = true;
        var columns = "";
        Papa.parse("https://cors-anywhere.herokuapp.com/" + distributionChoosenURL, {
            //worker: true,
            download: true,
            step: function(row, parser) {
                console.log("Row:", row.data);
                if(firstRow){
                    firstRow = false;
                    if(row.data.length > 0){
                        if(!spanishDomain){
                            columns = "The columns available are: ";
                        } else {
                            columns = "Las columnas disponibles son: ";
                        }

                        for(var i = 0; i < row.data.length; i++){
                            columns += row.data[i].replaceAll(",","").replaceAll(";","") + ", ";
                        }
                    } else {
                        if(!spanishDomain){
                            columns = "There cannot be found any columns.";
                        } else {
                            columns = "No se ha podido encontrar ninguna columna.";
                        }
                    }
                    console.log(columns);
                    Read(columns);
                    parser.abort();
                }
            },
            complete: function() {
                console.log("All done!");
            }
        });
    }
    else
    {
        if(!spanishDomain){
            Read("First choose a distribution using the voice command: Choose distribution 1 (or the desired number).");
        } else {
            Read("Primero elegir la distribución usando el comando de voz: Elegir distribución 1 (o el número deseado).");
        }
    }

}

function readCSVFromDistribution(distributionURL){
    console.log("readCSVFromDistribution: " + distributionURL);
    var xhr = new XMLHttpRequest();
    // Using https://cors-anywhere.herokuapp.com/ allows us to download http (insecure) datasets from https pages
    xhr.open("GET", "https://cors-anywhere.herokuapp.com/" + distributionURL, true);
    //xhr.setRequestHeader("Origin", '*');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
          console.log(JSON.stringify(xhr));
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          console.log(xhr.responseText);
        }
      }
    }
    xhr.send();
}

/*(function() {
    'use strict';

    // Your code here...
})();*/