window.AutoTuneClockConfig = (function () {
  const FACTORY_KEY = "autotune-widget-clock";

  const ELEMENT_KEYS = ["time", "date", "weekDay"];
  const ELEMENT_LABELS = { time: "Hora", date: "Data", weekDay: "Dia da semana" };

  const BASE_ELEMENT = {
    visible: true,
    x: 5,
    y: 5,
    width: 90,
    height: 20,
    fontSize: 14,
    color: "#ffffff",
    opacity: 100,
    fontFamily: "inherit",
    fontWeight: 500,
    textAlign: "center"
  };

  const DEFAULT_CLOCK = {
    elements: {
      time: {
        ...BASE_ELEMENT,
        x: 5,
        y: 8,
        width: 90,
        height: 42,
        fontSize: 36,
        fontWeight: 600
      },
      date: {
        ...BASE_ELEMENT,
        x: 5,
        y: 54,
        width: 90,
        height: 22,
        fontSize: 14,
        opacity: 90
      },
      weekDay: {
        ...BASE_ELEMENT,
        x: 5,
        y: 78,
        width: 90,
        height: 18,
        fontSize: 12,
        opacity: 75
      }
    },
    background: {
      enabled: true,
      color: "#121828",
      opacity: 85,
      borderRadius: 14,
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }
  };

  function cloneElement(el) {
    return {
      visible: el.visible !== false,
      x: Number(el.x) || 0,
      y: Number(el.y) || 0,
      width: Number(el.width) || 10,
      height: Number(el.height) || 10,
      fontSize: Number(el.fontSize) || BASE_ELEMENT.fontSize,
      color: el.color || BASE_ELEMENT.color,
      opacity: Number(el.opacity ?? 100),
      fontFamily: el.fontFamily || BASE_ELEMENT.fontFamily,
      fontWeight: Number(el.fontWeight ?? BASE_ELEMENT.fontWeight),
      textAlign: el.textAlign || BASE_ELEMENT.textAlign
    };
  }

  function mergeClock(partial) {
    const base = DEFAULT_CLOCK;
    const src = partial && typeof partial === "object" ? partial : {};
    const elements = {};
    ELEMENT_KEYS.forEach((key) => {
      elements[key] = cloneElement({
        ...base.elements[key],
        ...(src.elements && src.elements[key])
      });
    });
    const bg = src.background && typeof src.background === "object" ? src.background : {};
    return {
      elements,
      background: {
        enabled: bg.enabled !== false,
        color: bg.color || base.background.color,
        opacity: Number(bg.opacity ?? base.background.opacity),
        borderRadius: Number(bg.borderRadius ?? base.background.borderRadius),
        x: Number(bg.x ?? base.background.x),
        y: Number(bg.y ?? base.background.y),
        width: Number(bg.width ?? base.background.width),
        height: Number(bg.height ?? base.background.height)
      }
    };
  }

  function readFromRecord(record) {
    return mergeClock(record && record.clock);
  }

  return {
    FACTORY_KEY,
    ELEMENT_KEYS,
    ELEMENT_LABELS,
    BASE_ELEMENT,
    DEFAULT_CLOCK,
    mergeClock,
    readFromRecord
  };
})();
