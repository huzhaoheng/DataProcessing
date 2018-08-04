$("#download").click(function () {
	exportPlugin = window.table.getPlugin('exportFile');
	exportPlugin.downloadFile('csv', {filename: 'MyFile'});
})