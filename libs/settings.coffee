module.exports = {
  tableRecentOptions: [
    {
    value: 1 * 60 * 1000,
    text: 'Um minuto',
    selected: false
    },
    {
    value: 5 * 60 * 1000,
    text: 'Cinco minutos',
    selected: false
    },
    {
    value: 10 * 60 * 1000,
    text: 'Dez minutos',
    selected: false
    },
    {
    value: 15 * 60 * 1000,
    text: 'Quinze minutos',
    selected: false
    },
    {
    value: 20 * 60 * 1000,
    text: 'Vinte minutos',
    selected: true
    }
  ],
  selectedTableRecentMillis: (text) ->
    for option in @tableRecentOptions
      return option.value if option.selected
}