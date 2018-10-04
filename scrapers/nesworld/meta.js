const jsdom = require('jsdom');
const { JSDOM } = jsdom;

exports.gather = (url) => {
    const rowsAsync = [];
    return JSDOM.fromURL(url)
        .then((dom) => {
            const document = dom.window.document;
            document.querySelectorAll('.CONTENT-DATA > table tbody > tr')
                .forEach((row) => {
                    if (row.childElementCount > 1) {
                        rowsAsync.push(parseRow(row));
                    }
                });
            return Promise.all(rowsAsync);
        });
}

async function parseRow(row) {
    const meta = {
        title: '',
        slug: '',
        developer: '',
        platform: 'gbc',
        typetag: 'homebrew',
        description: '',
        screenshots: [],
        rom: '',
    };

    const columns = row.childElementCount;
    if (columns === 3) {
        // Screenshots
        meta.screenshots.push(row.querySelector('td:nth-child(1) > img').getAttribute('src'));
        row.querySelectorAll('td:nth-child(2) img').forEach((img) => {
            const src = img.getAttribute('src');
            if (!src.includes('disk_save') && !src.includes('homebrew_noscreenshot')) {
                meta.screenshots.push(src);
            }
        });

        // Rom Link
        meta.rom = row.querySelector('td:nth-child(2) center > a').getAttribute('href');

        let textNodesCount = 0;
        const contentNodes = row.querySelector('td:nth-child(3)').childNodes;
        contentNodes.forEach((node) => {
            switch (node.tagName) {
                // Title
                case 'FONT': {
                    meta.title = node.textContent.trim();
                    break;
                }
                // Developer
                case 'A': {
                    meta.developer = node.textContent.trim();
                    break;
                }
                // #TextNode
                case undefined: {
                    const text = node.textContent.trim();
                    // Developer or just 'By' text
                    if (textNodesCount === 0) {
                        if (text && text !== 'By') {
                            const matches = text.match(/By\s(.*)/);
                            meta.developer = (matches && matches.length > 1) ? matches[1] : 'Unknown';
                        }
                    }
                    // Description
                    else if (textNodesCount === 1) {
                        meta.description = text.trim();
                    }
                    textNodesCount++;
                    break;
                }
            }
        });

        // Type Tag
        if (meta.title.toLowerCase().includes('demo')) {
            meta.typetag = 'demo';
        }
    } else if (columns === 4) {
        // Rom Link
        meta.rom = row.querySelector('td:nth-child(2) a').getAttribute('href');

        // Title
        meta.title = row.querySelector('td:nth-child(3)').textContent.trim();

        //Developer
        meta.developer = row.querySelector('td:nth-child(4)').textContent.trim().substring(3);

        // Type Tag
        if (meta.title.toLowerCase().includes('demo')) {
            meta.typetag = 'demo';
        }
    } else {
        console.error('Unexpected number of columns on row: ', columns);
    }

    // Slug
    if (meta.title) {
        meta.slug = meta.title.toLowerCase().replace(/[\s\/\.]/g, '-').replace(/[^\w\-]/g, '');
    }

    // Clean up
    if (!meta.developer) delete meta.developer;
    if (!meta.description) delete meta.description;
    if (!meta.screenshots) delete meta.screenshots;

    return meta;
}