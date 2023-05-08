const mysqlPool = require('./mysqlpool');


async function getCount(item) {
    const [ results ] = await mysqlPool.query(
        `SELECT COUNT(*) AS count FROM ${item}`
    );
}


async function getPage(page, item) {
    const count = await getCount();
    const pageSize = 2;
    const lastPage = Math.ceil(count / pageSize);

    page = page > lastPage ? lastPage : page;
    page = page < 1 ? 1 : page;

    const offset = (page - 1) * pageSize;
    const [ results ] = await mysqlPool.query(
        `SELECT * FROM ${item} ORDER BY id LIMIT ?, ?`,
        [offset, pageSize]
    );

    return {
        item: results,
        page: page,
        totalPages: lastPage,
        pageSize: pageSize,
        count: count
    };
}