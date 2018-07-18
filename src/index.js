function hello(name = 'World') {
  return `Hello, ${name}!`;
}

function goodbye(name = 'World') {
  return `Bye ${name}.`;
}

export default {
  hello,
  goodbye,
};
