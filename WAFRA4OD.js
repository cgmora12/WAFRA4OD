// ==UserScript==
// @name         WAFRA4OD
// @namespace    http://tampermonkey.net/
// @version      0.1.5
// @description  WAFRA for Open Data (WAFRA4OD)
// @author       Cesar Gonzalez Mora
// @match        *://www.europeandataportal.eu/*
// @noframes
// @exclude      *://www.youtube.com/embed/*
// @grant        none
// @require http://code.jquery.com/jquery-3.3.1.slim.min.js
// @require http://code.jquery.com/jquery-3.3.1.min.js
// @require https://unpkg.com/papaparse@5.3.0/papaparse.min.js
// ==/UserScript==


/*********************** Variables ************************/
var myStorage = window.localStorage;
var readerRate = 1.0;
const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const recognition = new SpeechRecognition();
var timeoutResumeInfinity;

var apiResultDataset, apiResultPortalMetadata;
var distributionData = [];
var numberOfRowsToAutoDownload = 100;
var distributionDownloaded = false;

//var listeningActive = true;

var recognitionActive = true;
var recognitionFailedFirstTime = true;
var recognitionFailedText = "Command not recognised, please try again.";
var recognitionFailedTextES = "Comando no reconocido, por favor inténtelo de nuevo.";
var reading = false;
var readFirstTime = true;
var mainPage = false, resultsPage = false, datasetPage = false;

var operations = [];

var languageCodeSyntesis = "en";
var languageCodeCommands = "en";

var spanishDomain = false;

var languageCodeSyntesisES = "es";
var languageCodeCommandsES = "es";

var welcomeCommand = "welcome";
var stopListeningCommand = "stop listening";
var changeCommand = "change";
var cancelCommand = "cancel";
var activateCommand = "activate";
var deactivateCommand = "deactivate";
var changeCommandQuestion = "which command";
var newCommandQuestion = "which is the new command";
var chooseDistributionCommand = "choose distribution";
var downloadDistributionCommand = "download";

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
var downloadDistributionCommandES = "descargar";

var changeCommandInProcess1 = false;
var changeCommandInProcess2 = false;
var newCommandString = "";

var operationToChange;
var distributionChoosenURL = "", distributionChoosenTitle = "";

var readParams = ["title", "description", "distributions", "columns", "first row"];
var readParamsES = ["titulo", "descripcion", "distribuciones", "columnas", "primera fila"];
var goToParams = ["distributions", "description"];
var goToParamsES = ["distribuciones", "descripción"];

/*********************** Page is loaded ************************/
$(document).ready(function() {
    setTimeout(function(){
        init();
    }, 1000);
});

function init (){
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

    if(document.URL.startsWith("https://www.europeandataportal.eu/data/datasets/")){
        datasetPage = true;
        var apiURLdataset = document.URL.replace("https://www.europeandataportal.eu/data/datasets/", "https://www.europeandataportal.eu/data/search/datasets/");
        queryAPIdataset(apiURLdataset);
    } else if(document.URL.startsWith("https://www.europeandataportal.eu/data/datasets")){
        resultsPage = true;
        var apiURLresultsPage = "https://www.europeandataportal.eu/data/search/search";
        queryAPIportalMetadata(apiURLresultsPage);
    } else if(document.URL.startsWith("https://www.europeandataportal.eu")){
        mainPage = true;
        var apiURLmainPage = "https://www.europeandataportal.eu/data/search/search";
        queryAPIportalMetadata(apiURLmainPage);
    }

    /*********************** Add new operations here ************************/
    var welcome, search, addFilter, category, increaseFontSizeOperation, decreaseFontSizeOperation, readAloudOperation, goToOperation, goBackOperation, breadCrumbOperation;
    /*id; name; voiceCommand; activable; active; editable; hasMenu; mainPage; resultsPage; datasetPage;*/
    if(!spanishDomain){
        welcome = new WelcomeOperation("welcomeOperation", "Welcome", "welcome", true, true, true, false, true, true, true);
        search = new SearchOperation("searchOperation", "Search", "search", true, true, true, false, true, true, false);
        addFilter = new AddFilterOperation("addFilterOperation", "Add filter", "add filter", true, true, true, true, false, true, false);
        category = new CategoryOperation("categoryOperation", "Category", "category", true, true, true, true, true, true, false);
        increaseFontSizeOperation = new IncreaseFontSizeOperation("increaseFontSizeOperation", "Increase Font Size", "increase font size", true, true, true, false, true, true, true);
        decreaseFontSizeOperation = new DecreaseFontSizeOperation("decreaseFontSizeOperation", "Decrease Font Size", "decrease font size", true, true, true, false, true, true, true);
        readAloudOperation = new ReadAloudOperation("readAloud", "Read Aloud", "read aloud", true, true, true, true, false, false, true);
        goBackOperation = new GoBackOperation("goBack", "Go Back", "go back", true, true, true, false, false, true, true);
        breadCrumbOperation = new BreadcrumbOperation("breadcrumb", "Breadcrumb", "", true, true, true, false);
    } else {
        welcome = new WelcomeOperation("welcomeOperationES", "Bienvenida", "bienvenida", true, true, true, false, true, true, true);
        search = new SearchOperation("searchOperationES", "Buscar", "buscar", true, true, true, false, true, true, false);
        addFilter = new AddFilterOperation("addFilterOperationES", "Añadir filtro", "añadir filtro", true, true, true, true, false, true, false);
        category = new CategoryOperation("categoryOperationES", "Categoría", "categoría", true, true, true, true, true, true, false);
        increaseFontSizeOperation = new IncreaseFontSizeOperation("increaseFontSizeOperationES", "Aumentar Tamaño Letra", "aumentar tamaño letra", true, true, true, false, true, true, true);
        decreaseFontSizeOperation = new DecreaseFontSizeOperation("decreaseFontSizeOperationES", "Reducir Tamaño Letra", "reducir tamaño letra", true, true, true, false, true, true, true);
        readAloudOperation = new ReadAloudOperation("readAloudES", "Leer en voz alta", "leer", true, true, true, true, false, false, true);
        goBackOperation = new GoBackOperation("goBackES", "Volver", "volver", true, true, true, false, false, true, true);
        breadCrumbOperation = new BreadcrumbOperation("breadcrumbES", "Panel navegación", "", true, true, true, false, true, true, true);
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

}


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
    active;
    editable;
    hasMenu;
    mainPage;
    resultsPage;
    datasetPage;*/

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

    initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage) {
        this.id = id;
        this.name = name;
        this.voiceCommand = voiceCommand;
        //this.section = section;
        this.activable = activable;
        this.active = active;
        this.editable = editable;
        this.hasMenu = hasMenu;
        this.mainPage = mainPage;
        this.resultsPage = resultsPage;
        this.datasetPage = datasetPage;
        operations.push(this);
    }
}

class WelcomeOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
    }

    configureOperation(){

    }

    startOperation() {
        say();
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

class SearchOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
    }

    configureOperation(){

    }

    startOperation(term) {
        var parameters = term.currentTarget.params;
        search(parameters);
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

class AddFilterOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
    }

    configureOperation(){

    }

    startOperation(filter) {
        if(typeof filter !== 'undefined'){
            var parameters = filter.currentTarget.params;
            addFilter(parameters);
        } else {
            addFilter("");
        }
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

class CategoryOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
    }

    configureOperation(){

    }

    startOperation(category) {
        if(typeof category !== 'undefined'){
            var parameters = category.currentTarget.params;
            addCategory(parameters);
        } else {
            addCategory("");
        }
    }

    stopOperation() {
        console.log("Stop operation");
    }
}

class IncreaseFontSizeOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
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
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
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
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
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

    console.log("read: " + params);
    //closeGoToMenu();
    closeMenu();
    closeOperationsMenu();

    var readContent = "";

    //TODO: add all commands
    switch(params){
        case "title":
        case "titulo":
            getTitleText();
            break;
        case "description":
        case "descripcion":
            getDescriptionText();
            break;
        case "columns":
        case "columnas":
            getColumnsText();
            return;
            break;
        case "distributions":
        case "distribuciones":
            getDistributionsText();
            break;
        case "download":
        case "descargar":
            downloadDistribution();
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
    //Read(readContent);
}

// Go back
class GoBackOperation extends Operation {
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
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
    constructor(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage){
        super();
        this.initOperation(id, name, voiceCommand, activable, active, editable, hasMenu, mainPage, resultsPage, datasetPage);
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
    divMenu.style = "position: fixed; left: 2%; top: 12%; z-index: 100; line-height: 140%;";
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
    aToggleListening.href = 'javascript:;';
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
    a5.href = 'javascript:;';
    a5.addEventListener("click", function(){
        toggleMenu();
        toggleCommandsMenu();
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
    aOperations.href = 'javascript:;';
    aOperations.addEventListener("click", toggleOperationsMenu, false);
    if(!spanishDomain){
        aOperations.text = 'Accessibility Operations';
    } else {
        aOperations.text = 'Operaciones de Accesibilidad';
    }
    divButtons.appendChild(aOperations);

    var i = document.createElement('i');
    i.className = 'fa fa-close'
    i.style = "position: absolute; right: 10%; top: 40%; z-index: 100;"
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
        if((mainPage && operations[operationsIndex].mainPage) ||
           (resultsPage && operations[operationsIndex].resultsPage) ||
           (datasetPage && operations[operationsIndex].datasetPage)){
            var a = document.createElement('a');
            a.id = operations[operationsIndex].id.replaceAll('ES','');
            a.href = 'javascript:;';
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
                input.id = operations[operationsIndex].id.replaceAll('ES','') + "Input";
                input.value = operations[operationsIndex].id.replaceAll('ES','') + "Input";
                input.checked = operations[operationsIndex].active;
                input.style.setProperty("margin-left", "5px");
                if(operations[operationsIndex].active){
                    a.style.setProperty("pointer-events", "all");
                } else {
                    a.style.setProperty("pointer-events", "none");
                }

                input.addEventListener("change", function(){
                    for(var operationsI = 0; operationsI < operations.length; operationsI++){
                        if(operations[operationsI].id.replaceAll('ES','') === this.id.split("Input").join("")){
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
    readWelcome()
}

function readWelcome(){
    var readContent = "";
    if(!spanishDomain){
        readContent = "Welcome to " + document.title + "! The voice commands available are: ";
        for(var i = 0; i < operations.length; i++){
            if(mainPage && operations[i].mainPage){
                readContent += operations[i].voiceCommand + ", ";
            } else if(resultsPage && operations[i].resultsPage){
                readContent += operations[i].voiceCommand + ", ";
            } else if(datasetPage && operations[i].datasetPage){
                readContent += operations[i].voiceCommand + ", ";
            }
        }
        //TODO: remove when operations are created
        readContent += stopListeningCommand + ", " + chooseDistributionCommand + ", " + changeCommand + ", "
            + activateCommand + ", " + deactivateCommand + ", " + readFasterCommand + ", " + readSlowerCommand + ". ";
        //readContent += "The sections to read aloud are: " + readParams.toString() + ". And the sections to go directly are: " + goToParams.toString() + ".";
    } else {
        readContent = "¡Bienvenido a " + document.title + "! Los comandos de voz disponibles son: ";
        for(var j = 0; j < operations.length; j++){
            if(mainPage && operations[j].mainPage){
                readContent += operations[j].voiceCommand + ", ";
            } else if(resultsPage && operations[j].resultsPage){
                readContent += operations[j].voiceCommand + ", ";
            } else if(datasetPage && operations[j].datasetPage){
                readContent += operations[j].voiceCommand + ", ";
            }
        }
        //TODO: remove when operations are created
        readContent += stopListeningCommandES + ", " + chooseDistributionCommandES + ", " + changeCommandES + ", "
            + activateCommandES + ", " + deactivateCommandES + ", " + readFasterCommandES + ", " + readSlowerCommandES + ". ";
        //readContent += "Las secciones para leer en voz alta son: " + readParamsES.toString() + ". Y las secciones para ir directamente son: " + goToParamsES.toString() + ".";
    }

    Read(readContent);
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
        a1.href = 'javascript:;';
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
        a1.href = 'javascript:;';
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
        a1.href = 'javascript:;';
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
        /*readAloud("columnas");*/
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
                /*if(speechToText.includes(listOperationsCommand) || speechToText.includes(listOperationsCommandES)){
                    readOperations();
                }
                else if(speechToText.includes(welcomeCommand) || speechToText.includes(welcomeCommandES)){
                    readWelcome();
                }*/
                if(speechToText.includes(readFasterCommand) || speechToText.includes(readFasterCommandES)){
                    readFaster();
                }
                else if(speechToText.includes(readSlowerCommand) || speechToText.includes(readSlowerCommandES)){
                    readSlower();
                }
                else if(speechToText.includes(chooseDistributionCommand) || speechToText.includes(chooseDistributionCommandES)){
                    chooseDistribution(speechToText.replaceAll(chooseDistributionCommand, "").replaceAll(chooseDistributionCommandES, "").trim());
                }
                else if(speechToText.includes(downloadDistributionCommand) || speechToText.includes(downloadDistributionCommandES)){
                    downloadDistribution();
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
                                    var cleanCommand = operations[i].voiceCommand.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase();
                                    var parametersCommand = cleanSpeechText.replaceAll(cleanCommand, "").trim();
                                    if(parametersCommand !== "" && parametersCommand.length > 0 &&
                                       ((operations[i].mainPage && mainPage) || (operations[i].resultsPage && resultsPage) || (operations[i].datasetPage && datasetPage))){
                                        var params = {};
                                        var current = {};
                                        params.currentTarget = current;
                                        params.currentTarget.params = parametersCommand;
                                        params.currentTarget.operation = operations[i];
                                        operations[i].startOperation(params);
                                        return;
                                    } else if ((operations[i].mainPage && mainPage) || (operations[i].resultsPage && resultsPage) || (operations[i].datasetPage && datasetPage)){
                                        operations[i].startOperation();
                                        return;
                                    } else {
                                        if(!spanishDomain){
                                            Read("Operation " + operations[i].voiceCommand + " is not available in this page, please try in other pages of the portal.");
                                        } else {
                                            Read("Operación " + operations[i].voiceCommand + " no está disponible en esta página, por favor prueba en otras páginas del portal.");
                                        }
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
                            Read(recognitionFailedText + " You can use: " + welcomeCommand + " to know which operations are available and which sections can be read aloud.");
                        } else {
                            Read(recognitionFailedTextES + " Puedes usar: " + welcomeCommandES + " para saber que operaciones están disponibles y qué secciones se pueden leer en voz alta.");
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

        for(var i2 = 0; i2 < readParams.length; i2++){
            commandsAux.push(readParams[i2]);
        }

        for(var i3 = 0; i3 < goToParams.length; i3++){
            commandsAux.push(goToParams[i3]);
        }
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

        for(var j2 = 0; j2 < readParams.length; j2++){
            commandsAux.push(readParams[j2]);
        }

        for(var j3 = 0; j3 < goToParams.length; j3++){
            commandsAux.push(goToParams[j3]);
        }
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

function queryAPIdataset(apiURL){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", apiURL, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log("api queried: " + apiURL);
                //console.log(xhr.responseText);
                apiResultDataset = JSON.parse(xhr.responseText).result;
                console.log(apiResultDataset);

                if(distributionChoosenURL === ""){
                    // choose distribution csv by order (last)
                    var csvDistribution, csvDistributionAux;
                    for(var i = 0; i < apiResultDataset.distributions.length; i++){
                        if(apiResultDataset.distributions[i].format != null && apiResultDataset.distributions[i].format.id === "CSV"){
                            csvDistribution = apiResultDataset.distributions[i];
                            distributionChoosenURL = csvDistribution.access_url;
                            if(!spanishDomain){
                                distributionChoosenTitle = csvDistribution.title.en;
                            } else {
                                distributionChoosenTitle = csvDistribution.title.es;
                            }
                        }
                    }
                    downloadDistributionToInteract();
                }
            }
        }
    }
    xhr.send();
}

function queryAPIportalMetadata(apiURL){
    var xhr = new XMLHttpRequest();
    xhr.open("POST", apiURL, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log("api queried: " + apiURL);
                //console.log(xhr.responseText);
                apiResultPortalMetadata = JSON.parse(xhr.responseText).result;
                console.log(apiResultPortalMetadata);
            }
        }
    }
    xhr.send(JSON.stringify({q: "string", filter: "dataset", limit: 0, searchParams: {minDate: "2021-01-04T13:42:27Z", maxDate: "2021-01-04T13:42:27Z"}}));
}

function search(term){

    if(term == null || typeof term == 'undefined' || term == "[object MouseEvent]"){
        term = "";
    }

    if(!spanishDomain){
        Read("Performing the search and redirecting to the results page.");
    }
    else{
        Read("Realizando la búsqueda y redirigiendo a la página de resultados.");
    }
    setTimeout(function(){
        window.location.href = '/data/datasets?query=' + term;
    }, 3000);
}

function addFilter(filter){

    var readContent = "";

    if(filter == null || typeof filter == 'undefined' || filter == "[object MouseEvent]"){
        filter = "";
    }

    if(filter == ""){
        // read aloud available filters
        if(apiResultPortalMetadata !== null && apiResultPortalMetadata !== ""
           && apiResultPortalMetadata.facets !== null && apiResultPortalMetadata.facets !== ""){
            for(var i = 0; i < apiResultPortalMetadata.facets.length; i++){
                readContent += apiResultPortalMetadata.facets[i].id + "; ";
            }
        }

        if(readContent == ""){
            if(!spanishDomain){
                Read("No filters are available now, please try again later or in other page of the portal.");
            }
            else{
                Read("Ahora no hay filtros disponibles, prueba más tarde o en otra página del portal.");
            }
        } else {
            if(!spanishDomain){
                Read("The available filters are: " + readContent + ". You can use the same voice command indicating the filter and its value.");
            }
            else{
                Read("Los filtros disponibles son: " + readContent + ". Puedes utilizar el mismo comando de voz indicando el filtro que deseas y el valor a filtrar.");
            }
        }

    } else {
        //read available values for specific filter
        if((filter.match(" ") || []).length == 0){
            // No value is provided
            for(var j = 0; j < apiResultPortalMetadata.facets.length; j++){
                if(apiResultPortalMetadata.facets[j].id == filter){
                    for(var k = 0; k < apiResultPortalMetadata.facets[j].items.length; k++){
                        //check for language tag
                        if(apiResultPortalMetadata.facets[j].items[k].title.en && !spanishDomain){
                            readContent += apiResultPortalMetadata.facets[j].items[k].title.en + "; ";
                        } else if(apiResultPortalMetadata.facets[j].items[k].title.es && spanishDomain){
                            readContent += apiResultPortalMetadata.facets[j].items[k].title.es + "; ";
                        } else {
                            readContent += apiResultPortalMetadata.facets[j].items[k].title + "; ";
                        }
                    }
                }
            }

            if(readContent == ""){
                if(!spanishDomain){
                    Read("The filter specified does not exist, please try again.");
                }
                else{
                    Read("El filtro especificado no existe, por favor inténtalo de nuevo.");
                }
            } else {
                if(!spanishDomain){
                    Read("The available values for the filter " + filter + " are: " + readContent + ". You can use the same voice command indicating the filter and its value.");
                }
                else{
                    Read("Los valores para el filtro " + filter + " son: " + readContent + ". Puedes utilizar el mismo comando de voz indicando el filtro que deseas y el valor a filtrar.");
                }
            }
        } else {
            //apply specific filter if existing
            //{ "q": "string",  "filter": "dataset",  "limit": 10,  "facets": { "format": [ "CSV" ] } }

            var filterId = filter.split(" ")[0];
            var filterValue = filter.substring(filter.indexOf(" ") + 1);
            var filterValueId = "";
            var filterExists = false, filterValueExists = false;
            // check if filter exist, if value is possible and get value id to apply filter
            for(var a = 0; a < apiResultPortalMetadata.facets.length && !filterExists; a++){
                if(apiResultPortalMetadata.facets[a].id == filterId){
                    filterExists = true;
                    for(var b = 0; b < apiResultPortalMetadata.facets[a].items.length && !filterValueExists; b++){
                        //check for language tag
                        var filterValueNormalized = filterValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                        var titleNormalized;
                        if(apiResultPortalMetadata.facets[a].items[b].title.en && !spanishDomain){
                            titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.en.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                        } else if(apiResultPortalMetadata.facets[a].items[b].title.es && spanishDomain){
                            titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.es.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                        } else {
                            titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                        }
                        if(titleNormalized == filterValueNormalized){
                            filterValueExists = true;
                            filterValueId = apiResultPortalMetadata.facets[a].items[b].id;
                        }
                    }
                }
            }

            if(filterExists && filterValueExists){
                if(!spanishDomain){
                    Read("Applying the filter and redirecting to the updated results page.");
                }
                else{
                    Read("Aplicando los filtros y redirigiendo a la página con la lista actualizada.");
                }
                setTimeout(function(){
                    window.location.href = window.location.href + "&" + filterId + "=" + filterValueId;
                }, 3000);
            } else {
                if(filterExists){
                    if(!spanishDomain){
                        Read("The filter value does not exist, please try other value.");
                    }
                    else{
                        Read("El valor a filtrar no es válido, por favor pruebe otro valor.");
                    }
                } else {
                    if(!spanishDomain){
                        Read("The filter does not exist, please try other filter.");
                    }
                    else{
                        Read("El filtro no existe, por favor pruebe otro filtro.");
                    }
                }
            }
        }

    }

}

function addCategory(category){

    var readContent = "";

    if(category == null || typeof category == 'undefined' || category == "[object MouseEvent]"){
        category = "";
    }

    if(category == ""){
        // read aloud available categories
        if(apiResultPortalMetadata !== null && apiResultPortalMetadata !== ""
           && apiResultPortalMetadata.facets !== null && apiResultPortalMetadata.facets !== ""){
            for(var j = 0; j < apiResultPortalMetadata.facets.length; j++){
                if(apiResultPortalMetadata.facets[j].id == "categories"){
                    for(var k = 0; k < apiResultPortalMetadata.facets[j].items.length; k++){
                        //check for language tag
                        if(apiResultPortalMetadata.facets[j].items[k].title.en && !spanishDomain){
                            readContent += apiResultPortalMetadata.facets[j].items[k].title.en + "; ";
                        } else if(apiResultPortalMetadata.facets[j].items[k].title.es && spanishDomain){
                            readContent += apiResultPortalMetadata.facets[j].items[k].title.es + "; ";
                        } else {
                            readContent += apiResultPortalMetadata.facets[j].items[k].title + "; ";
                        }
                    }
                }
            }
        }

        if(readContent == ""){
            if(!spanishDomain){
                Read("No categories are available now, please try again later or in other page of the portal.");
            }
            else{
                Read("Ahora no hay categorías disponibles, prueba más tarde o en otra página del portal.");
            }
        } else {
            if(!spanishDomain){
                Read("The available categories are: " + readContent + ". You can use the same voice command indicating the category name.");
            }
            else{
                Read("Las categorías disponibles son: " + readContent + ". Puedes utilizar el mismo comando de voz indicando el nombre de la categoría.");
            }
        }

    } else {
        //apply specific category if existing
        var categoryValue = category;
        var categoryValueId = "";
        var categoryValueExists = false, filterExists = false;
        // check if filter exist, if value is possible and get value id to apply filter
        for(var a = 0; a < apiResultPortalMetadata.facets.length && !filterExists; a++){
            if(apiResultPortalMetadata.facets[a].id == "categories"){
                filterExists = true;
                for(var b = 0; b < apiResultPortalMetadata.facets[a].items.length && !categoryValueExists; b++){
                    //check for language tag
                    var filterValueNormalized = categoryValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                    var titleNormalized;
                    if(apiResultPortalMetadata.facets[a].items[b].title.en && !spanishDomain){
                        titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.en.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                    } else if(apiResultPortalMetadata.facets[a].items[b].title.es && spanishDomain){
                        titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.es.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                    } else {
                        titleNormalized = apiResultPortalMetadata.facets[a].items[b].title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').replace(/\s+/g,' ').trim().toLowerCase().replace(",","");
                    }
                    if(titleNormalized == filterValueNormalized){
                        categoryValueExists = true;
                        categoryValueId = apiResultPortalMetadata.facets[a].items[b].id;
                    }
                }
            }
        }

        if(filterExists && categoryValueExists){
            if(!spanishDomain){
                Read("Applying the category and redirecting to the results page.");
            }
            else{
                Read("Aplicando la categoría y redirigiendo a la página de resultados.");
            }
            setTimeout(function(){
                if(mainPage){
                    window.location.href = "/data/datasets?categories=" + categoryValueId;
                }
                else {
                    window.location.href = window.location.href + "&categories=" + categoryValueId;
                }
            }, 3000);
        } else {
            if(filterExists){
                if(!spanishDomain){
                    Read("The filter value does not exist, please try other value.");
                }
                else{
                    Read("El valor a filtrar no es válido, por favor pruebe otro valor.");
                }
            } else {
                if(!spanishDomain){
                    Read("The filter does not exist, please try other filter.");
                }
                else{
                    Read("El filtro no existe, por favor pruebe otro filtro.");
                }
            }
        }

    }

}

function getTitleText(){
    console.log("getTitleText");
    var text = "";
    if(!spanishDomain){
        text = "Title: " + apiResultDataset.title.en;
    } else {
        text = "Título: " + apiResultDataset.title.es;
    }
    Read(text);
}

function getDescriptionText(){
    console.log("getDescriptionText");
    var text = "";
    //var descriptionElement = getElementByXPath("/html/body/div/div/div[2]/div/div[2]/div[1]/div/div/p");
    //text = descriptionElement.textContent;
    if(!spanishDomain){
        text = "Description: " + apiResultDataset.description.en;
    } else {
        text = "Descripción: " + apiResultDataset.description.es;
    }
    Read(text);
}

function downloadDistribution(){
    console.log("downloadDistribution");
    var link = document.createElement("a");
    console.log("distributionChoosenTitle: " + distributionChoosenTitle);
    link.download = distributionChoosenTitle;
    console.log("distributionChoosenURL: " + distributionChoosenURL);
    link.href = distributionChoosenURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;

    if(!spanishDomain){
        Read("Distribution downloaded to your computer.");
    } else {
        Read("Distribución descargada a su ordenador.");
    }
}

function getDistributionsText(){
    //TODO: get text from api
    console.log("getDistributionsText");
    //var distributionItems = document.getElementsByClassName("distributions__item");

    var text = "";

    if(!spanishDomain){
        text += "The distributions available are: ";
    } else {
        text += "Las distribuciones disponibles son: ";
    }

    var format = "";
    for(var i = 0; i < apiResultDataset.distributions.length; i++){
        //format = distributionItems[i].firstElementChild.firstElementChild.firstElementChild.getAttribute("type");
        //if(format === "CSV"){
        var distributionNumber = i+1;
        var distributionTitle = "";
        if(!spanishDomain){
            distributionTitle = apiResultDataset.distributions[i].title.en;
        } else {
            distributionTitle = apiResultDataset.distributions[i].title.es;
        }

        text += distributionNumber + ", " + distributionTitle;

        if(!spanishDomain){
            text += " in " + format + " format; ";
        } else {
            text += " en formato " + format + "; ";
        }
        //}
    }

    Read(text);
}

function chooseDistribution(number){
    console.log("chooseDistribution: " + number);

    if(number !== "" && number >= 1){
        for(var i = 0; i < apiResultDataset.distributions.length; i++){
            var index = i - 1;
            if(apiResultDataset.distributions[i].format.id.toLower() === "csv" && index === number){
                var csvDistribution = apiResultDataset.distributions[i];
                distributionChoosenURL = csvDistribution.access_url;
                if(!spanishDomain){
                    distributionChoosenTitle = csvDistribution.title.en;
                }
                else{
                    distributionChoosenTitle = csvDistribution.title.es;
                }
            }
        }
        //distributionChoosenURL = document.getElementsByClassName("distributions__item")[number-1].firstElementChild.lastElementChild.firstElementChild.lastElementChild.lastElementChild.lastElementChild.firstElementChild.firstElementChild.href;
    }

    if(!spanishDomain){
        Read("Distribution " + number + " choosen. Now you can ask for data of that distribution.");
    } else {
        Read("Distribución " + number + " elegida. Ahora puedes preguntar por los datos de dicha distribución.");
    }

}

function getColumnsText(){

    var firstRow = true;
    console.log("getColumnsText: " + distributionChoosenURL);

    if(distributionChoosenURL !== ""){

        if(!distributionDownloaded){
            downloadDistributionToInteract();
            if(!spanishDomain){
                Read("Accessing data, please try again in a while...");
            } else {
                Read("Accediendo a los datos, por favor pruebe de nuevo en unos instantes...");
            }
        } else {
            var columns = "";
            if(distributionData[0].length > 0){
                if(!spanishDomain){
                    columns = "The columns available are: ";
                } else {
                    columns = "Las columnas disponibles son: ";
                }

                for(var i = 0; i < distributionData[0].length; i++){
                    columns += distributionData[0][i].replaceAll(",","").replaceAll(";","") + ", ";
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
    else
    {
        if(!spanishDomain){
            Read("First choose a distribution using the voice command: Choose distribution 1 (or the desired number).");
        } else {
            Read("Primero elegir la distribución usando el comando de voz: Elegir distribución 1 (o el número deseado).");
        }
    }

}

//TODO: get rows functions


function downloadDistributionToInteract(){
    var columns = "";
    var counter = 0;
    //TODO: create own https server that redirects to dataset
    Papa.parse("https://cors-anywhere.herokuapp.com/" + distributionChoosenURL, {
        //worker: true,
        download: true,
        step: function(row, parser) {
            distributionData.push(row.data);
            counter++;
            if(counter >= numberOfRowsToAutoDownload){
                parser.abort();
            }
        },
        complete: function() {
            console.log("All done!");
            distributionDownloaded = true;
        }
    });

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
}



function createCSSSelector (selector, style) {
  if (!document.styleSheets) return;
  if (document.getElementsByTagName('head').length == 0) return;

  var styleSheet,mediaType;

  if (document.styleSheets.length > 0) {
    for (var i = 0, l = document.styleSheets.length; i < l; i++) {
      if (document.styleSheets[i].disabled)
        continue;
      var media = document.styleSheets[i].media;
      mediaType = typeof media;

      if (mediaType === 'string') {
        if (media === '' || (media.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i];
        }
      }
      else if (mediaType=='object') {
        if (media.mediaText === '' || (media.mediaText.indexOf('screen') !== -1)) {
          styleSheet = document.styleSheets[i];
        }
      }

      if (typeof styleSheet !== 'undefined')
        break;
    }
  }

  if (typeof styleSheet === 'undefined') {
    var styleSheetElement = document.createElement('style');
    styleSheetElement.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(styleSheetElement);

    for (i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].disabled) {
        continue;
      }
      styleSheet = document.styleSheets[i];
    }

    mediaType = typeof styleSheet.media;
  }

  if (mediaType === 'string') {
    for (i = 0, l = styleSheet.rules.length; i < l; i++) {
      if(styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase()==selector.toLowerCase()) {
        styleSheet.rules[i].style.cssText = style;
        return;
      }
    }
    styleSheet.addRule(selector,style);
  }
  else if (mediaType === 'object') {
    var styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0;
    for (i = 0; i < styleSheetLength; i++) {
      if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
        styleSheet.cssRules[i].style.cssText = style;
        return;
      }
    }
    styleSheet.insertRule(selector + '{' + style + '}', styleSheetLength);
  }
}

/*(function() {
    'use strict';

    // Your code here...
})();*/