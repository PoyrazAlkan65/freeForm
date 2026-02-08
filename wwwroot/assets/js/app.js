// Senin mevcut ajax yaklaşımın:
// ProfAJAXPost / ProfAJAXGet fonksiyonları ajaxManager.js içinde. :contentReference[oaicite:1]{index=1}
// Bu dosyada yoksa, sayfaya ayrıca ekleyebilirsin (globalde mevcutsa direkt çalışır).

(function(){
    const root = document.querySelector(".ach-fd-root");
    if(!root) return;
  
    const formId = Number(root.getAttribute("data-formid") || 0);
    const ajaxBase = root.getAttribute("data-ajaxbase") || "/ach/api";
  
    // Form inputs
    const elFormTitle = document.getElementById("FormTitle");
    const elFormDesc = document.getElementById("FormDesc");
    const elActionButtonText = document.getElementById("ActionButtonText");
    const submitPreviewBtn = document.getElementById("submitPreviewBtn");
  
    // Canvas
    const dropzone = document.getElementById("dropzone");
    const formCanvas = document.getElementById("formCanvas");
    const fieldCount = document.getElementById("fieldCount");
  
    // Props
    const propsEmpty = document.getElementById("propsEmpty");
    const propsEditor = document.getElementById("propsEditor");
    const pFieldName = document.getElementById("FieldName");
    const pFieldTitle = document.getElementById("FieldTitle");
    const pFieldType = document.getElementById("FieldType");
    const pFieldOptions = document.getElementById("FieldOptions");
    const pFieldValidScript = document.getElementById("FieldValidScript");
    const pFieldCss = document.getElementById("FieldCss");
    const pIsActive = document.getElementById("IsActive");
    const btnDeleteField = document.getElementById("btnDeleteField");
  
    // Actions
    const btnSave = document.getElementById("btnSave");
    const btnPreview = document.getElementById("btnPreview");
  
    // In-memory model (DB karşılığı)
    const model = {
      form: {
        Id: formId,
        FormName: "",
        FormTitle: "",
        FormDesc: "",
        IsActive: true,
        ActionButtonText: "Gönder",
        AddCss: "",
        AddJs: ""
      },
      fields: []
    };
  
    let selectedFieldId = null;
  
    // Helpers
    function uid(){
      // client-side id (DB insert olunca değişebilir)
      return Date.now() + Math.floor(Math.random()*1000);
    }
  
    function setSelected(id){
      selectedFieldId = id;
      [...document.querySelectorAll(".ach-field-item")].forEach(x=>{
        x.classList.toggle("selected", Number(x.getAttribute("data-id")) === Number(id));
      });
  
      const f = model.fields.find(x => Number(x._cid) === Number(id));
      if(!f){
        propsEmpty.classList.remove("ach-hidden");
        propsEditor.classList.add("ach-hidden");
        return;
      }
  
      propsEmpty.classList.add("ach-hidden");
      propsEditor.classList.remove("ach-hidden");
  
      pFieldName.value = f.FieldName || "";
      pFieldTitle.value = f.FieldTitle || "";
      pFieldType.value = f.FieldType || "";
      pFieldOptions.value = normalizeOptionsToTextarea(f.FieldOptions);
      pFieldValidScript.value = f.FieldValidScript || "";
      pFieldCss.value = f.FieldCss || "";
      pIsActive.checked = !!f.IsActive;
    }
  
    function normalizeOptionsToTextarea(opt){
      if(!opt) return "";
      try{
        const arr = JSON.parse(opt);
        if(Array.isArray(arr)) return arr.join("\n");
        return String(opt);
      }catch(e){
        return String(opt);
      }
    }
  
    function textareaToOptionsJson(val){
      const raw = (val || "").trim();
      if(!raw) return null;
      // JSON verilmişse dokunma
      if(raw.startsWith("[") && raw.endsWith("]")) return raw;
      // satır satır -> JSON array
      const arr = raw.split("\n").map(x=>x.trim()).filter(Boolean);
      return JSON.stringify(arr);
    }
  
    function render(){
      formCanvas.innerHTML = "";
      model.fields.forEach(f=>{
        const div = document.createElement("div");
        div.className = "ach-field-item";
        div.setAttribute("data-id", f._cid);
  
        div.innerHTML = `
          <div class="ach-field-head">
            <div>
              <div class="ach-field-title">${escapeHtml(f.FieldTitle || "(Başlıksız Alan)")}</div>
              <div class="ach-fd-muted">${escapeHtml(f.FieldName || "")}</div>
            </div>
            <div class="ach-pill">${escapeHtml(f.FieldType || "")}</div>
          </div>
        `;
  
        div.addEventListener("click", ()=> setSelected(f._cid));
        formCanvas.appendChild(div);
      });
  
      fieldCount.textContent = `${model.fields.length} alan`;
      submitPreviewBtn.textContent = (elActionButtonText.value || "Gönder");
      // seçiliyi koru
      if(selectedFieldId != null) setSelected(selectedFieldId);
    }
  
    function escapeHtml(str){
      return (str ?? "").toString()
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }
  
    // Drag start
    document.querySelectorAll(".ach-fd-tool").forEach(tool=>{
      tool.addEventListener("dragstart", (e)=>{
        e.dataTransfer.setData("text/plain", tool.getAttribute("data-type"));
      });
    });
  
    // Dropzone allow
    dropzone.addEventListener("dragover", (e)=>{
      e.preventDefault();
    });
  
    // Drop
    dropzone.addEventListener("drop", (e)=>{
      e.preventDefault();
      const type = e.dataTransfer.getData("text/plain");
      if(!type) return;
  
      const nextIndex = model.fields.length + 1;
      const f = {
        Id: 0,
        _cid: uid(),
        FormId: model.form.Id || 0,
        FieldName: `Field${nextIndex}`,
        FieldTitle: `Alan ${nextIndex}`,
        FieldType: type,
        FieldOptions: (type === "select" || type === "radio") ? JSON.stringify(["Seçenek 1","Seçenek 2"]) : null,
        FieldValidScript: "",
        FieldCss: "",
        IsActive: true
      };
  
      model.fields.push(f);
      render();
      setSelected(f._cid);
    });
  
    // Props -> Model binding
    function bindProps(){
      function apply(){
        const f = model.fields.find(x => Number(x._cid) === Number(selectedFieldId));
        if(!f) return;
  
        f.FieldName = pFieldName.value.trim();
        f.FieldTitle = pFieldTitle.value.trim();
        f.FieldOptions = textareaToOptionsJson(pFieldOptions.value);
        f.FieldValidScript = pFieldValidScript.value;
        f.FieldCss = pFieldCss.value;
        f.IsActive = !!pIsActive.checked;
  
        render();
      }
  
      [pFieldName, pFieldTitle, pFieldOptions, pFieldValidScript, pFieldCss].forEach(x=>{
        x.addEventListener("input", apply);
      });
      pIsActive.addEventListener("change", apply);
  
      btnDeleteField.addEventListener("click", ()=>{
        if(selectedFieldId == null) return;
        model.fields = model.fields.filter(x => Number(x._cid) !== Number(selectedFieldId));
        selectedFieldId = null;
        render();
        setSelected(null);
      });
    }
  
    // Form inputs binding
    function bindForm(){
      function applyForm(){
        model.form.FormTitle = elFormTitle.value;
        model.form.FormDesc = elFormDesc.value;
        model.form.ActionButtonText = elActionButtonText.value || "Gönder";
        submitPreviewBtn.textContent = model.form.ActionButtonText;
      }
      [elFormTitle, elFormDesc, elActionButtonText].forEach(x => x.addEventListener("input", applyForm));
    }
  
    // Load existing
    function loadIfNeeded(){
      if(!model.form.Id || model.form.Id <= 0){
        // new
        model.form.FormTitle = "";
        model.form.FormDesc = "";
        model.form.ActionButtonText = "Gönder";
        render();
        return;
      }
  
      // ProfAJAXGet kullanımı: settings.FE_SOURCEAJAXURL + endpoint :contentReference[oaicite:2]{index=2}
      if(typeof ProfAJAXGet !== "function"){
        console.warn("ProfAJAXGet bulunamadı. ajaxManager.js yüklemelisin.");
        render();
        return;
      }
  
      ProfAJAXGet(`/forms/${model.form.Id}`, {}, "forms_get");
  
      window.AFTER_forms_get = function(result){
        if(!result || !result.ok) return;
  
        model.form = Object.assign(model.form, result.form || {});
        model.fields = (result.fields || []).map(x => Object.assign({ _cid: uid() }, x));
  
        elFormTitle.value = model.form.FormTitle || "";
        elFormDesc.value = model.form.FormDesc || "";
        elActionButtonText.value = model.form.ActionButtonText || "Gönder";
  
        render();
      };
    }
  
    // Save
    function bindSave(){
      btnSave.addEventListener("click", ()=>{
        model.form.FormTitle = elFormTitle.value;
        model.form.FormDesc = elFormDesc.value;
        model.form.ActionButtonText = elActionButtonText.value || "Gönder";
  
        if(typeof ProfAJAXPost !== "function"){
          alert("ProfAJAXPost bulunamadı. ajaxManager.js yüklemelisin.");
          return;
        }
  
        ProfAJAXPost(`/forms/save`, model.form, "forms_save");
  
        window.AFTER_forms_save = function(r1){
          if(!r1 || !r1.ok){
            alert("Form kaydı başarısız.");
            return;
          }
          model.form.Id = Number(r1.Id || model.form.Id || 0);
  
          const payload = {
            fields: model.fields.map(f => ({
              Id: f.Id || 0,
              FormId: model.form.Id,
              FieldName: f.FieldName,
              FieldTitle: f.FieldTitle,
              FieldType: f.FieldType,
              FieldOptions: f.FieldOptions,
              FieldValidScript: f.FieldValidScript,
              FieldCss: f.FieldCss,
              IsActive: !!f.IsActive
            }))
          };
  
          ProfAJAXPost(`/forms/${model.form.Id}/fields/save`, payload, "fields_save");
  
          window.AFTER_fields_save = function(r2){
            if(!r2 || !r2.ok){
              alert("Alanlar kaydedilemedi.");
              return;
            }
            alert(`Kaydedildi. (${r2.count} alan)`);
          };
        };
      });
  
      btnPreview.addEventListener("click", ()=>{
        // hızlı önizleme: yeni pencerede basit render (istersen ayrı route)
        const w = window.open("", "_blank");
        const html = `
          <html><head><meta charset="utf-8"><title>Önizleme</title></head>
          <body style="font-family:system-ui;padding:20px">
            <h2>${escapeHtml(elFormTitle.value || "Form")}</h2>
            <p>${escapeHtml(elFormDesc.value || "")}</p>
            <hr/>
            ${model.fields.filter(x=>x.IsActive).map(f => renderPreviewField(f)).join("")}
            <button style="margin-top:12px;padding:10px 14px">${escapeHtml(elActionButtonText.value || "Gönder")}</button>
          </body></html>
        `;
        w.document.write(html);
        w.document.close();
      });
    }
  
    function renderPreviewField(f){
      const title = escapeHtml(f.FieldTitle || "");
      const name = escapeHtml(f.FieldName || "");
      switch((f.FieldType||"").toLowerCase()){
        case "textarea":
          return `<div style="margin:10px 0"><label><b>${title}</b></label><br/><textarea name="${name}" rows="3" style="width:360px"></textarea></div>`;
        case "select":
          {
            let opts = [];
            try{ opts = JSON.parse(f.FieldOptions||"[]"); }catch(e){}
            return `<div style="margin:10px 0"><label><b>${title}</b></label><br/>
              <select name="${name}" style="width:360px">
                ${opts.map(o=>`<option>${escapeHtml(o)}</option>`).join("")}
              </select>
            </div>`;
          }
        default:
          return `<div style="margin:10px 0"><label><b>${title}</b></label><br/><input name="${name}" type="text" style="width:360px;padding:8px"/></div>`;
      }
    }
  
    // init
    bindProps();
    bindForm();
    bindSave();
    loadIfNeeded();
    render();
  
  })();
  