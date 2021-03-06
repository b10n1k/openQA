/* jshint multistr: true */

function setupAdminAssets() {
    // determine params for AJAX queries
    var pageQueryParams = parseQueryParams();
    var ajaxQueryParams = {};
    var paramValues = pageQueryParams.force_refresh;
    if (paramValues && paramValues.length > 0) {
        ajaxQueryParams.force_refresh = paramValues[0];
    }

    // setup data table
    var assetsTable = $('#assets');
    window.assetsTable = assetsTable.DataTable({
            ajax: {
                url: assetsTable.data('status-url'),
                data: ajaxQueryParams,
                dataSrc: function(json) {
                    showLastAssetStatusUpdate(json);
                    makeAssetsByGroup(json);
                    return json.data;
                },
                error: function (xhr, error, thrown) {
                    var response = xhr.responseJSON;
                    var errorMsg = 'Unable to request asset status: ' +
                        (response && response.error ? response.error : thrown) +
                        ' <a class="btn btn-primary" href="javascript: reloadAssetsTable();">Retry</a>';
                    addFlash('danger', errorMsg);
                    $('#assets-by-group-loading').hide();
                    $('#assets-status').text('failed to load');
                }
            },
            columns: [
                { data: "name" },
                { data: "max_job" },
                { data: "size" },
                { data: "groups" },
            ],
            columnDefs: [
                {
                    targets: 0,
                    render: function(data, type, row) {
                        if (type !== 'display') {
                            return data;
                        }
                        return data + '<a href="#" onclick="deleteAsset(' + row.id + ');">\
                                <i class="action far fa-fw fa-times-circle" title="Delete asset"></i>\
                                </a>';
                    }
                },
                {
                    targets: 1,
                    render: function(data, type, row) {
                        if (type !== 'display') {
                            return data;
                        }
                        if (!data) {
                            return 'none';
                        }
                        return '<a href="/tests/' + data + '">' + data + '</a>';
                    }
                },
                {
                    targets: 2,
                    render: function(data, type, row) {
                        if (type !== 'display') {
                            return data;
                        }
                        if (data === '') {
                            return 'unknown';
                        }
                        var dataWithUnit = renderDataSize(data);
                        if (dataWithUnit) {
                            return dataWithUnit;
                        }
                        return data;
                    }
                },
                {
                    targets: 3,
                    render: function(data, type, row) {
                        var groupIds = Object.keys(data).sort();
                        if (type !== 'display') {
                            return groupIds.join(',');
                        }
                        var pickedInto = row.picked_into;
                        for (var groupIndex in groupIds) {
                            var groupId = parseInt(groupIds[groupIndex]);
                            var className = 'not-picked';
                            if (pickedInto === groupId) {
                                className = 'picked-group';
                            } else if (pickedInto === 0) {
                                className = 'to-be-removed';
                            }
                            groupIds[groupIndex] = '<a class="' + className +
                                '" href="/group_overview/' + groupId + '">' +
                                groupId + '</a>';
                        }
                        return groupIds.length ? groupIds.join(' ') : 'none';
                    }
                },

            ],
            order: [[1, 'desc']],
        }
    );
}

function reloadAssetsTable() {
    $('#assets-by-group-loading').show();
    $('#assets-status').text('loading');
    $('#flash-messages div.alert').remove();
    window.assetsTable.ajax.reload();
}

function deleteAsset(assetId) {
    $.ajax({
        url: '/api/v1/assets/' + assetId,
        method: 'DELETE',
        success: function() {
            $('#asset_' + assetId).remove();
        },
        error: function(xhr, ajaxOptions, thrownError) {
            window.alert('The asset couldn\'t be deleted: ' + thrownError);
        }
    });
}

function triggerAssetCleanup(form) {
    $.ajax({
        url: form.action,
        method: form.method,
        success: function() {
            addFlash('info', 'Asset cleanup has been triggered. Open the <a href="/minion">Minion dashboard</a> to keep track of the task.');
        },
        error: function(xhr, ajaxOptions, thrownError) {
            addFlash('danger', 'Unable to trigger the asset cleanup: ' + thrownError);
        }
    });
}

function showLastAssetStatusUpdate(assetStatus) {
    if (assetStatus.last_update) {
        $('#assets-status').html('last update: ' + renderTimeAgo(assetStatus.last_update, 'display'));
    }
}

function makeAssetsByGroup(assetStatus) {
    var assetsByGroupHeading = $('#assets-by-group-heading');
    var assetsByGroupList = $('#assets-by-group');
    var totalSize = 0;
    var groups = assetStatus.groups;
    var assets = assetStatus.data;

    $('#assets-by-group-loading').hide();

    // make the asset list for the particular groups
    var assetsByGroup = {};
    assets.sort(function(b, a) {
        return a.name.localeCompare(b.name);
    }).forEach(function(asset) {
        if (!asset.size || asset.picked_into === undefined) {
            return;
        }

        // make the ul element but don't populate the li elements already
        var assetUl = assetsByGroup[asset.picked_into];
        if (!assetUl) {
            assetsByGroup[asset.picked_into] = assetUl = $('<ul></ul>');
            assetUl.assets = [];

            // add method lazy-initialize the ul element
            assetUl.populate = function() {
                this.assets.forEach(function(asset) {
                    var assetLi = $('<li></li>');
                    assetLi.text(asset.name);
                    assetLi.append('<span>' + renderDataSize(asset.size) + '</span>');
                    assetUl.append(assetLi);
                });
            };
        }
        assetUl.assets.push(asset);
    });

    // add li element for each group, sorted by used asset size and group name
    Object.keys(groups).sort(function(b, a) {
        a = groups[a];
        b = groups[b];
        if (a.picked < b.picked) {
            return -1;
        } else if (b.picked < a.picked) {
            return 1;
        }
        return a.group.localeCompare(b.group);
    }).forEach(function(groupId) {
        var groupInfo = groups[groupId];
        if (!groupInfo.picked) {
            return;
        }

        var groupLi = $('<li></li>');

        // add input for expanding/collapsing
        var groupCheckbox = $('<input id="group-' + groupId + '-checkbox" type="checkbox"></input>');
        groupLi.append(groupCheckbox);
        var label = $('<label for="group-' + groupId + '-checkbox">' + groupInfo.group + '</label>');
        groupLi.append(label);

        // add configure button
        if (window.isAdmin && groupId !== undefined && groupId !== "0") {
            groupLi.append('<a href="/admin/job_templates/' + groupId +
                '"><i class="fa fa-wrench" title="Configure"></i></a>');
        }

        // add size
        var size = groupInfo.picked;
        totalSize += size;
        var sizeString = renderDataSize(size);
        if (groupInfo.size_limit_gb) {
            sizeString += ' / ' + groupInfo.size_limit_gb + ' GiB';
        }
        groupLi.append('<span>' + sizeString + '</span>');

        // setup lazy-loading for list of assets
        var assetUl = assetsByGroup[groupId];
        if (assetUl) {
            groupCheckbox.change(function() {
                if (assetUl.initialized) {
                    return;
                }
                assetUl.populate();
                groupLi.append(assetUl);
                assetUl.initialized = true;
            });
        }

        assetsByGroupList.append(groupLi);
    });

    assetsByGroupHeading.text('Assets by group (total ' + renderDataSize(totalSize) + ')');
}
