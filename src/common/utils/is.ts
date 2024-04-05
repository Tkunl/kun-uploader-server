function isEmpty(val: any) {
  return val === void 0 || val === null;
}

function isNotEmpty(val: any) {
  return !isEmpty(val);
}

export { isEmpty, isNotEmpty };
