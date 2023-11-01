const variableHandler = {
    get(target, property) {
      console.log(`Getting ${property}`);
      return target[property];
    },
    set(target, property, value) {
      console.log(`Setting ${property} to ${value}`);
      target[property] = value;
      // Additional logic or event triggering can be done here
      console.log('myVariable has been updated:', target[property]);
      return true;
    },
  };