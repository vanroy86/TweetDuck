enabled(){
  // elements & data
  this.css = null;
  this.htmlModal = null;
  this.config = null;
  
  this.defaultConfig = {
    columnWidth: "310px",
    fontSize: "12px",
    avatarRadius: 10
  };
  
  // modal dialog loading
  $TDP.readFileRoot(this.$token, "modal.html").then(contents => {
    this.htmlModal = contents;
  }).catch(err => {
    $TD.alert("error", "Problem loading data for the design edit plugin: "+err.message);
  });
  
  // configuration
  const configFile = "config.json";
  this.tmpConfig = null;
  
  var loadConfigObject = obj => {
    this.tmpConfig = obj || {};
    
    if (window.TD_APP_READY){
      this.onAppReady();
    }
  };
  
  this.onAppReady = () => {
    if (this.tmpConfig !== null){
      this.config = $.extend(this.defaultConfig, this.tmpConfig);
      this.tmpConfig = null;
      this.reinjectAll();
    }
  };
  
  $TDP.checkFileExists(this.$token, configFile).then(exists => {
    if (!exists){
      loadConfigObject(null);
    }
    else{
      $TDP.readFile(this.$token, configFile, true).then(contents => {
        try{
          loadConfigObject(JSON.parse(contents));
        }catch(err){
          loadConfigObject(null);
        }
      }).catch(err => {
        loadConfigObject(null);
        $TD.alert("error", "Problem loading configuration for the design edit plugin: "+err.message);
      });
    }
  });
  
  this.saveConfig = () => {
    $TDP.writeFile(this.$token, configFile, JSON.stringify(this.config)).catch(err => {
      $TD.alert("error", "Problem saving configuration for the design edit plugin: "+err.message);
    });
  };
  
  // settings click event
  this.onSettingsMenuClickedEvent = () => {
    if (this.htmlModal === null || this.config === null){
      return;
    }
    
    setTimeout(() => {
      let menu = $(".js-dropdown-content").children("ul").first();
      if (menu.length === 0)return;
      
      let itemTD = menu.children("[data-std]").first();
      if (itemTD.length === 0)return;
      
      if (!itemTD.prev().hasClass("drp-h-divider")){
        itemTD.before('<li class="drp-h-divider"></li>');
      }
      
      let itemEditDesign = $('<li class="is-selectable"><a href="#" data-action>Edit layout &amp; design</a></li>');
      itemTD.after(itemEditDesign);
      
      itemEditDesign.on("click", "a", function(){
        new customDesignModal();
      });
      
      itemEditDesign.hover(function(){
        $(this).addClass("is-selected");
      }, function(){
        $(this).removeClass("is-selected");
      });
    }, 1);
  };
  
  // modal dialog setup
  var me = this;
  
  var updateKey = function(key, value){
    me.config[key] = value;
    
    setTimeout(function(){
      me.saveConfig();
      me.reinjectAll();
    }, 1); // delays the slight lag caused by saving and reinjection
  };
  
  var customDesignModal = TD.components.BaseModal.extend(function(){
    let modal = $("#td-design-plugin-modal");
    this.setAndShowContainer(modal, false);
    
    modal.find("[data-td-key]").each(function(){
      let item = $(this);
      let key = item.attr("data-td-key");
      
      if (item.prop("tagName") === "SELECT"){
        item.val(me.config[key]);
        
        item.change(function(){
          updateKey(key, item.val());
        });
      }
      else{
        let value = item.attr("data-td-value");
        
        if (value == me.config[key]){
          item.addClass("selected");
        }

        item.click(function(){
          modal.find("[data-td-key='"+key+"']").removeClass("selected");
          item.addClass("selected");
          updateKey(key, value);
        });
      }
    });
    
    modal.find("[data-td-theme='"+TD.settings.getTheme()+"']").prop("checked", true);
    
    modal.find("[data-td-theme]").change(function(){
      TD.settings.setTheme($(this).attr("data-td-theme"));
      $(document).trigger("uiToggleTheme");
    });
  }).methods({
    _render: () => $(this.htmlModal),
    destroy: function(){
      $("#td-design-plugin-modal").hide();
      this.supr();
    }
  });
  
  // css and layout injection
  this.resetLayout = function(){
  };
  
  this.resetDesign = function(){
    if (this.css){
      this.css.remove();
    }
    
    this.css = window.TDPF_createCustomStyle(this);
  };
  
  this.reinjectAll = function(){
    this.resetLayout();
    this.resetDesign();
    
    this.css.insert(".txt-base-smallest, .txt-base-largest { font-size: "+this.config.fontSize+" !important }");
    this.css.insert(".avatar { border-radius: "+this.config.avatarRadius+"% !important }");
    
    if (this.config.columnWidth[0] === '/'){
      let cols = this.config.columnWidth.slice(1);
      
      this.css.insert(".column { width: calc((100vw - 205px) / "+cols+" - 8px) !important }");
      this.css.insert(".is-condensed .column { width: calc((100vw - 55px) / "+cols+" - 8px) !important }");
    }
    else{
      this.css.insert(".column { width: "+this.config.columnWidth+" !important }");
    }
    
    switch(this.config.columnWidth){
      case "/6":
        TD.settings.setColumnWidth("narrow");
        break;
        
      case "310px":
      case "/5":
        TD.settings.setColumnWidth("medium");
        break;
        
      default:
        TD.settings.setColumnWidth(parseInt(this.config.columnWidth, 10) < 310 ? "narrow" : "wide"); // NaN will give "wide"
        break;
    }
    
    switch(this.config.fontSize){
      case "13px": TD.settings.setFontSize("small"); break;
      case "14px": TD.settings.setFontSize("medium"); break;
      case "15px": TD.settings.setFontSize("large"); break;
      default: TD.settings.setFontSize(parseInt(this.config.fontSize, 10) >= 16 ? "largest" : "smallest"); break;
    }
  };
}

ready(){
  // configuration
  switch(TD.settings.getColumnWidth()){
    case "wide": this.defaultConfig.columnWidth = "350px"; break;
    case "narrow": this.defaultConfig.columnWidth = "270px"; break;
  }
  
  switch(TD.settings.getFontSize()){
    case "small": this.defaultConfig.fontSize = "13px"; break;
    case "medium": this.defaultConfig.fontSize = "14px"; break;
    case "large": this.defaultConfig.fontSize = "15px"; break;
    case "largest": this.defaultConfig.fontSize = "16px"; break;
  }
  
  this.onAppReady();
  
  // DOM
  $("[data-action='settings-menu']").on("click", this.onSettingsMenuClickedEvent);
  $(".js-app").append('<div id="td-design-plugin-modal" class="js-modal settings-modal ovl scroll-v scroll-styled-v"></div>');
}

disabled(){
  this.resetLayout();
  
  if (this.css){
    this.css.remove();
  }
  
  $("[data-action='settings-menu']").off("click", this.onSettingsMenuClickedEvent);
  $("#td-design-plugin-modal").remove();
}
