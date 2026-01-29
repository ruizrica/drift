//! Data access detector - Detects database access patterns in source code
//!
//! AST-first approach: Uses tree-sitter parsed CallSite data to detect
//! database access patterns. Regex is only used as fallback for SQL strings
//! embedded in code that can't be captured via AST.

use regex::Regex;
use super::types::*;
use crate::parsers::{ParseResult, CallSite};

/// Data access detector - AST-first with regex fallbacks for SQL strings
pub struct DataAccessDetector {
    // Regex fallbacks for SQL strings (AST can't parse SQL inside strings)
    sql_select: Regex,
    sql_insert: Regex,
    sql_update: Regex,
    sql_delete: Regex,
}

impl DataAccessDetector {
    pub fn new() -> Self {
        Self {
            // SQL regex - only used for raw SQL strings that AST can't parse
            sql_select: Regex::new(r"(?i)SELECT\s+.+\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)").unwrap(),
            sql_insert: Regex::new(r"(?i)INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)").unwrap(),
            sql_update: Regex::new(r"(?i)UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)").unwrap(),
            sql_delete: Regex::new(r"(?i)DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)").unwrap(),
        }
    }
    
    /// Detect data access from AST-parsed call sites (primary method)
    pub fn detect_from_ast(&self, result: &ParseResult, file: &str) -> Vec<DataAccessPoint> {
        let mut access_points = Vec::new();
        
        for call in &result.calls {
            if let Some(access) = self.detect_from_call_site(call, file) {
                access_points.push(access);
            }
        }
        
        access_points
    }
    
    /// Detect data access from a single AST call site
    fn detect_from_call_site(&self, call: &CallSite, file: &str) -> Option<DataAccessPoint> {
        let receiver = call.receiver.as_deref();
        let callee = call.callee.as_str();
        
        // Supabase JS: supabase.from('table')
        // Supabase Python: supabase.table('table')
        if (callee == "from" || callee == "table") && receiver.map_or(false, |r| r.contains("supabase")) {
            return Some(DataAccessPoint {
                table: "unknown".to_string(), // Table name is in string arg, need source
                operation: DataOperation::Read,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.9,
                framework: Some("supabase".to_string()),
            });
        }
        
        // Supabase auth: supabase.auth.sign_up(), supabase.auth.sign_in_with_password()
        if let Some(recv) = receiver {
            if recv.contains("supabase") && recv.contains("auth") {
                let operation = match callee {
                    "sign_up" | "sign_in_with_password" | "sign_in_with_otp" | 
                    "sign_in_with_oauth" | "sign_out" | "refresh_session" => DataOperation::Write,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "auth.users".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("supabase-auth".to_string()),
                });
            }
            
            // Supabase storage: supabase.storage.from_('bucket')
            if recv.contains("supabase") && recv.contains("storage") {
                let operation = match callee {
                    "upload" | "remove" | "move" | "copy" => DataOperation::Write,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "storage.objects".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("supabase-storage".to_string()),
                });
            }
        }
        
        // Prisma: prisma.user.findMany(), this.prisma.user.findMany(), prisma.post.create()
        if let Some(recv) = receiver {
            // Handle both "prisma.user" and "this.prisma.user" patterns
            let prisma_table = if recv.starts_with("this.prisma.") {
                Some(recv.strip_prefix("this.prisma.").unwrap_or("unknown"))
            } else if recv.starts_with("prisma.") {
                Some(recv.strip_prefix("prisma.").unwrap_or("unknown"))
            } else if recv.contains(".prisma.") {
                // Handle other patterns like "self.prisma.user"
                recv.split(".prisma.").nth(1)
            } else {
                None
            };
            
            if let Some(table) = prisma_table {
                let operation = match callee {
                    "create" | "createMany" | "update" | "updateMany" | "upsert" => DataOperation::Write,
                    "delete" | "deleteMany" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: table.to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.95,
                    framework: Some("prisma".to_string()),
                });
            }
        }
        
        // TypeORM: getRepository(Entity)
        if callee == "getRepository" {
            return Some(DataAccessPoint {
                table: "unknown".to_string(),
                operation: DataOperation::Read,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.9,
                framework: Some("typeorm".to_string()),
            });
        }
        
        // Sequelize: Model.findAll(), Model.create()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_sequelize = matches!(callee, 
                    "findAll" | "findOne" | "findByPk" | "create" | "update" | "destroy" | "bulkCreate"
                );
                if is_sequelize {
                    let operation = match callee {
                        "create" | "update" | "bulkCreate" => DataOperation::Write,
                        "destroy" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("sequelize".to_string()),
                    });
                }
            }
        }
        
        // Django: Model.objects.filter(), Model.objects.create()
        if let Some(recv) = receiver {
            if recv.ends_with(".objects") {
                let model = recv.strip_suffix(".objects").unwrap_or("unknown");
                let operation = match callee {
                    "create" | "update" | "bulk_create" | "bulk_update" => DataOperation::Write,
                    "delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: format!("{}s", model.to_lowercase()),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("django".to_string()),
                });
            }
        }
        
        // GORM (Go): db.Find(), db.Create()
        if receiver == Some("db") {
            let is_gorm = matches!(callee, 
                "Find" | "First" | "Last" | "Take" | "Create" | "Save" | "Update" | "Delete"
            );
            if is_gorm {
                let operation = match callee {
                    "Create" | "Save" | "Update" => DataOperation::Write,
                    "Delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("gorm".to_string()),
                });
            }
        }
        
        // Diesel (Rust): users::table.filter()
        if let Some(recv) = receiver {
            if recv.ends_with("::table") {
                let table = recv.strip_suffix("::table").unwrap_or("unknown");
                return Some(DataAccessPoint {
                    table: table.to_string(),
                    operation: DataOperation::Read,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("diesel".to_string()),
                });
            }
        }
        
        // =========================================================================
        // TypeScript/JavaScript ORMs
        // =========================================================================
        
        // Drizzle: db.select().from(users), db.insert(users), db.update(users), db.delete(users)
        if receiver == Some("db") {
            let is_drizzle = matches!(callee, "select" | "insert" | "update" | "delete" | "query");
            if is_drizzle {
                let operation = match callee {
                    "insert" | "update" => DataOperation::Write,
                    "delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("drizzle".to_string()),
                });
            }
        }
        
        // Knex: knex('table'), knex.select(), knex.insert()
        if receiver.map_or(false, |r| r == "knex" || r.ends_with(".knex")) {
            let operation = match callee {
                "insert" | "update" => DataOperation::Write,
                "delete" | "del" | "truncate" => DataOperation::Delete,
                _ => DataOperation::Read,
            };
            return Some(DataAccessPoint {
                table: "unknown".to_string(),
                operation,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.85,
                framework: Some("knex".to_string()),
            });
        }
        
        // Mongoose: Model.find(), Model.findOne(), Model.save(), Model.deleteOne()
        if let Some(recv) = receiver {
            let is_mongoose = matches!(callee,
                "find" | "findOne" | "findById" | "findOneAndUpdate" | "findOneAndDelete" |
                "save" | "create" | "insertMany" | "updateOne" | "updateMany" |
                "deleteOne" | "deleteMany" | "remove" | "aggregate" | "countDocuments"
            );
            if is_mongoose && recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let operation = match callee {
                    "save" | "create" | "insertMany" | "updateOne" | "updateMany" | "findOneAndUpdate" => DataOperation::Write,
                    "deleteOne" | "deleteMany" | "remove" | "findOneAndDelete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: recv.to_lowercase(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("mongoose".to_string()),
                });
            }
        }
        
        // Kysely: db.selectFrom('table'), db.insertInto('table'), db.updateTable('table')
        if receiver == Some("db") {
            let is_kysely = matches!(callee, "selectFrom" | "insertInto" | "updateTable" | "deleteFrom");
            if is_kysely {
                let operation = match callee {
                    "insertInto" | "updateTable" => DataOperation::Write,
                    "deleteFrom" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("kysely".to_string()),
                });
            }
        }
        
        // MikroORM: em.find(), em.persist(), em.flush(), em.remove()
        if receiver == Some("em") || receiver == Some("this.em") || receiver == Some("entityManager") {
            let is_mikroorm = matches!(callee,
                "find" | "findOne" | "findOneOrFail" | "findAll" | "findAndCount" |
                "persist" | "persistAndFlush" | "flush" | "remove" | "removeAndFlush" |
                "create" | "assign" | "nativeInsert" | "nativeUpdate" | "nativeDelete"
            );
            if is_mikroorm {
                let operation = match callee {
                    "persist" | "persistAndFlush" | "flush" | "create" | "assign" | 
                    "nativeInsert" | "nativeUpdate" => DataOperation::Write,
                    "remove" | "removeAndFlush" | "nativeDelete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("mikroorm".to_string()),
                });
            }
        }
        
        // TypeORM DataSource/Repository: dataSource.getRepository(), repository.find()
        if let Some(recv) = receiver {
            if recv.contains("dataSource") || recv.contains("DataSource") {
                if callee == "getRepository" || callee == "manager" {
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation: DataOperation::Read,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("typeorm".to_string()),
                    });
                }
            }
            // TypeORM repository pattern
            if recv.ends_with("Repository") || recv.ends_with("repository") || recv == "repo" {
                let is_typeorm_repo = matches!(callee,
                    "find" | "findOne" | "findOneBy" | "findBy" | "findAndCount" |
                    "save" | "insert" | "update" | "upsert" | "delete" | "remove" |
                    "softDelete" | "restore" | "count" | "exist" | "createQueryBuilder"
                );
                if is_typeorm_repo {
                    let operation = match callee {
                        "save" | "insert" | "update" | "upsert" | "restore" => DataOperation::Write,
                        "delete" | "remove" | "softDelete" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.strip_suffix("Repository").or(recv.strip_suffix("repository")).unwrap_or(recv).to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("typeorm".to_string()),
                    });
                }
            }
        }
        
        // Objection.js: Model.query(), Model.relatedQuery()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_objection = matches!(callee, 
                    "query" | "relatedQuery" | "knex" | "knexQuery"
                );
                if is_objection {
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation: DataOperation::Read,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("objection".to_string()),
                    });
                }
            }
        }
        
        // Bookshelf.js: Model.forge(), Model.fetchAll(), model.save()
        if let Some(recv) = receiver {
            let is_bookshelf = matches!(callee,
                "forge" | "fetch" | "fetchAll" | "fetchOne" | "save" | "destroy" |
                "where" | "query" | "count" | "orderBy"
            );
            if is_bookshelf && recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let operation = match callee {
                    "save" => DataOperation::Write,
                    "destroy" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: recv.to_lowercase(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.8,
                    framework: Some("bookshelf".to_string()),
                });
            }
        }
        
        // node-postgres (pg): pool.query(), client.query()
        if let Some(recv) = receiver {
            if recv == "pool" || recv == "client" || recv.ends_with("Pool") || recv.ends_with("Client") {
                if callee == "query" || callee == "connect" {
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation: DataOperation::Read, // Could be any, determined by SQL
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("node-postgres".to_string()),
                    });
                }
            }
        }
        
        // mysql2: connection.query(), connection.execute()
        if let Some(recv) = receiver {
            if recv == "connection" || recv == "conn" || recv.contains("mysql") || recv.contains("Mysql") {
                let is_mysql2 = matches!(callee, "query" | "execute" | "beginTransaction" | "commit" | "rollback");
                if is_mysql2 {
                    let operation = match callee {
                        "beginTransaction" | "commit" | "rollback" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("mysql2".to_string()),
                    });
                }
            }
        }
        
        // better-sqlite3: db.prepare(), stmt.run(), stmt.get(), stmt.all()
        if let Some(recv) = receiver {
            if recv == "db" || recv == "database" || recv.contains("sqlite") {
                let is_better_sqlite = matches!(callee, "prepare" | "exec" | "pragma" | "transaction" | "backup");
                if is_better_sqlite {
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation: DataOperation::Read,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("better-sqlite3".to_string()),
                    });
                }
            }
            // Statement methods
            if recv == "stmt" || recv.ends_with("Stmt") || recv.contains("statement") {
                let is_stmt = matches!(callee, "run" | "get" | "all" | "iterate" | "pluck" | "expand" | "bind");
                if is_stmt {
                    let operation = match callee {
                        "run" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("better-sqlite3".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Python ORMs
        // =========================================================================
        
        // SQLAlchemy: session.query(Model), session.add(), session.delete()
        if receiver == Some("session") || receiver == Some("db") || receiver == Some("self.session") {
            let is_sqlalchemy = matches!(callee, 
                "query" | "add" | "add_all" | "delete" | "execute" | "scalar" | "scalars" | "commit" | "flush"
            );
            if is_sqlalchemy {
                let operation = match callee {
                    "add" | "add_all" | "commit" | "flush" => DataOperation::Write,
                    "delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("sqlalchemy".to_string()),
                });
            }
        }
        
        // Tortoise ORM: Model.filter(), Model.create(), Model.all()
        if let Some(recv) = receiver {
            let is_tortoise = matches!(callee,
                "filter" | "all" | "get" | "get_or_none" | "first" | "create" | "update" | "delete" |
                "bulk_create" | "bulk_update" | "count" | "exists"
            );
            if is_tortoise && recv.chars().next().map_or(false, |c| c.is_uppercase()) && !recv.contains(".objects") {
                let operation = match callee {
                    "create" | "update" | "bulk_create" | "bulk_update" => DataOperation::Write,
                    "delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: recv.to_lowercase(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.8,
                    framework: Some("tortoise".to_string()),
                });
            }
        }
        
        // Peewee: Model.select(), Model.create(), Model.get()
        if let Some(recv) = receiver {
            let is_peewee = matches!(callee,
                "select" | "create" | "get" | "get_or_none" | "get_or_create" | "get_by_id" |
                "insert" | "insert_many" | "update" | "delete" | "save" |
                "where" | "order_by" | "limit" | "count"
            );
            if is_peewee && recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let operation = match callee {
                    "create" | "insert" | "insert_many" | "update" | "save" | "get_or_create" => DataOperation::Write,
                    "delete" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: recv.to_lowercase(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("peewee".to_string()),
                });
            }
        }
        
        // SQLModel (FastAPI + SQLAlchemy): session.exec(), session.add()
        // Uses same session pattern as SQLAlchemy but with exec() instead of execute()
        if receiver == Some("session") || receiver == Some("db") {
            if callee == "exec" || callee == "get" {
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation: DataOperation::Read,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("sqlmodel".to_string()),
                });
            }
        }
        
        // Pony ORM: select(), db.Entity, commit()
        if callee == "select" && receiver.is_none() {
            // Pony uses standalone select() function
            return Some(DataAccessPoint {
                table: "unknown".to_string(),
                operation: DataOperation::Read,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.7,
                framework: Some("ponyorm".to_string()),
            });
        }
        if callee == "commit" && receiver.is_none() {
            return Some(DataAccessPoint {
                table: "unknown".to_string(),
                operation: DataOperation::Write,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.7,
                framework: Some("ponyorm".to_string()),
            });
        }
        
        // asyncpg: conn.fetch(), conn.fetchrow(), conn.execute()
        if let Some(recv) = receiver {
            if recv == "conn" || recv == "connection" || recv.contains("pool") {
                let is_asyncpg = matches!(callee,
                    "fetch" | "fetchrow" | "fetchval" | "execute" | "executemany" |
                    "copy_from_query" | "copy_to_table" | "prepare"
                );
                if is_asyncpg {
                    let operation = match callee {
                        "execute" | "executemany" | "copy_to_table" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("asyncpg".to_string()),
                    });
                }
            }
        }
        
        // psycopg2/psycopg3: cursor.execute(), cursor.fetchall()
        if let Some(recv) = receiver {
            if recv == "cursor" || recv == "cur" || recv.ends_with("_cursor") {
                let is_psycopg = matches!(callee,
                    "execute" | "executemany" | "fetchone" | "fetchall" | "fetchmany" |
                    "copy_from" | "copy_to" | "copy_expert" | "callproc"
                );
                if is_psycopg {
                    let operation = match callee {
                        "execute" | "executemany" | "copy_to" | "copy_expert" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("psycopg".to_string()),
                    });
                }
            }
        }
        
        // PyMongo: collection.find(), collection.insert_one(), db.collection_name
        if let Some(recv) = receiver {
            if recv == "collection" || recv.ends_with("_collection") || recv.contains(".") {
                let is_pymongo = matches!(callee,
                    "find" | "find_one" | "find_one_and_update" | "find_one_and_delete" | "find_one_and_replace" |
                    "insert_one" | "insert_many" | "update_one" | "update_many" | "replace_one" |
                    "delete_one" | "delete_many" | "aggregate" | "count_documents" | "distinct" |
                    "create_index" | "drop_index" | "bulk_write"
                );
                if is_pymongo {
                    let operation = match callee {
                        "insert_one" | "insert_many" | "update_one" | "update_many" | 
                        "replace_one" | "find_one_and_update" | "find_one_and_replace" |
                        "bulk_write" | "create_index" => DataOperation::Write,
                        "delete_one" | "delete_many" | "find_one_and_delete" | "drop_index" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.split('.').last().unwrap_or("unknown").to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("pymongo".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Java ORMs
        // =========================================================================
        
        // Spring Data JPA: repository.findAll(), repository.save(), repository.deleteById()
        if let Some(recv) = receiver {
            if recv.ends_with("Repository") || recv.ends_with("repository") {
                let operation = match callee {
                    "save" | "saveAll" | "saveAndFlush" => DataOperation::Write,
                    "delete" | "deleteById" | "deleteAll" | "deleteAllById" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: recv.strip_suffix("Repository").or(recv.strip_suffix("repository")).unwrap_or(recv).to_lowercase(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("spring-data-jpa".to_string()),
                });
            }
        }
        
        // Hibernate/JPA EntityManager: em.find(), em.persist(), em.remove()
        if receiver == Some("em") || receiver == Some("entityManager") || receiver == Some("this.em") {
            let is_jpa = matches!(callee,
                "find" | "persist" | "merge" | "remove" | "createQuery" | "createNativeQuery" |
                "flush" | "refresh" | "detach" | "getReference"
            );
            if is_jpa {
                let operation = match callee {
                    "persist" | "merge" | "flush" => DataOperation::Write,
                    "remove" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("jpa".to_string()),
                });
            }
        }
        
        // MyBatis: mapper.select(), mapper.insert(), @Select annotations
        if let Some(recv) = receiver {
            if recv.ends_with("Mapper") || recv.ends_with("mapper") || recv.ends_with("Dao") || recv.ends_with("dao") {
                let is_mybatis = matches!(callee,
                    "select" | "selectOne" | "selectList" | "selectMap" | "selectCursor" |
                    "insert" | "update" | "delete" | "selectById" | "selectByIds" |
                    "insertBatch" | "updateBatch" | "deleteBatch"
                );
                if is_mybatis {
                    let operation = match callee {
                        "insert" | "insertBatch" | "update" | "updateBatch" => DataOperation::Write,
                        "delete" | "deleteBatch" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.strip_suffix("Mapper").or(recv.strip_suffix("mapper"))
                            .or(recv.strip_suffix("Dao")).or(recv.strip_suffix("dao"))
                            .unwrap_or(recv).to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("mybatis".to_string()),
                    });
                }
            }
        }
        
        // JDBC: statement.executeQuery(), preparedStatement.execute()
        if let Some(recv) = receiver {
            if recv == "statement" || recv == "stmt" || recv == "preparedStatement" || 
               recv == "ps" || recv.ends_with("Statement") {
                let is_jdbc = matches!(callee,
                    "executeQuery" | "executeUpdate" | "execute" | "executeBatch" |
                    "executeLargeUpdate" | "executeLargeBatch" | "addBatch"
                );
                if is_jdbc {
                    let operation = match callee {
                        "executeUpdate" | "executeLargeUpdate" | "executeBatch" | "executeLargeBatch" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.95,
                        framework: Some("jdbc".to_string()),
                    });
                }
            }
        }
        
        // jOOQ: dsl.select(), dsl.insertInto(), dsl.update()
        if let Some(recv) = receiver {
            if recv == "dsl" || recv == "ctx" || recv == "create" || recv.ends_with("DSL") {
                let is_jooq = matches!(callee,
                    "select" | "selectFrom" | "selectOne" | "selectCount" | "selectDistinct" |
                    "insertInto" | "update" | "delete" | "deleteFrom" | "mergeInto" |
                    "fetch" | "fetchOne" | "fetchAny" | "execute"
                );
                if is_jooq {
                    let operation = match callee {
                        "insertInto" | "update" | "mergeInto" | "execute" => DataOperation::Write,
                        "delete" | "deleteFrom" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("jooq".to_string()),
                    });
                }
            }
        }
        
        // Micronaut Data: repository methods (similar to Spring Data)
        // Already covered by Spring Data JPA pattern above
        
        // Quarkus Panache: Entity.find(), Entity.persist(), Entity.delete()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_panache = matches!(callee,
                    "find" | "findById" | "findAll" | "list" | "listAll" | "stream" | "streamAll" |
                    "persist" | "persistAndFlush" | "update" | "delete" | "deleteById" | "deleteAll" |
                    "count" | "exists" | "flush"
                );
                if is_panache {
                    let operation = match callee {
                        "persist" | "persistAndFlush" | "update" | "flush" => DataOperation::Write,
                        "delete" | "deleteById" | "deleteAll" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("panache".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // C# ORMs
        // =========================================================================
        
        // Entity Framework: context.Users.Where(), context.SaveChanges(), context.Add()
        if let Some(recv) = receiver {
            if recv.ends_with("Context") || recv.ends_with("context") || recv == "_context" || recv == "db" || recv == "_db" {
                // DbSet operations
                let is_ef = matches!(callee,
                    "Add" | "AddRange" | "Update" | "UpdateRange" | "Remove" | "RemoveRange" |
                    "Find" | "FindAsync" | "SaveChanges" | "SaveChangesAsync" |
                    "Where" | "FirstOrDefault" | "FirstOrDefaultAsync" | "ToList" | "ToListAsync" |
                    "SingleOrDefault" | "SingleOrDefaultAsync" | "Any" | "AnyAsync" | "Count" | "CountAsync"
                );
                if is_ef {
                    let operation = match callee {
                        "Add" | "AddRange" | "Update" | "UpdateRange" | "SaveChanges" | "SaveChangesAsync" => DataOperation::Write,
                        "Remove" | "RemoveRange" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("entity-framework".to_string()),
                    });
                }
            }
        }
        
        // Dapper: connection.Query(), connection.Execute()
        if let Some(recv) = receiver {
            if recv.contains("connection") || recv.contains("Connection") || recv == "conn" || recv == "_conn" {
                let is_dapper = matches!(callee,
                    "Query" | "QueryAsync" | "QueryFirst" | "QueryFirstAsync" | "QueryFirstOrDefault" |
                    "QuerySingle" | "QuerySingleAsync" | "Execute" | "ExecuteAsync" |
                    "ExecuteScalar" | "ExecuteScalarAsync"
                );
                if is_dapper {
                    let operation = match callee {
                        "Execute" | "ExecuteAsync" => DataOperation::Write, // Could be any, but often write
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("dapper".to_string()),
                    });
                }
            }
        }
        
        // NHibernate: session.Query(), session.Save(), session.Delete()
        if let Some(recv) = receiver {
            if recv == "session" || recv == "_session" || recv.ends_with("Session") {
                let is_nhibernate = matches!(callee,
                    "Query" | "QueryOver" | "Get" | "Load" | "CreateQuery" | "CreateCriteria" |
                    "Save" | "SaveOrUpdate" | "Update" | "Merge" | "Persist" |
                    "Delete" | "Evict" | "Refresh" | "Flush"
                );
                if is_nhibernate {
                    let operation = match callee {
                        "Save" | "SaveOrUpdate" | "Update" | "Merge" | "Persist" | "Flush" => DataOperation::Write,
                        "Delete" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("nhibernate".to_string()),
                    });
                }
            }
        }
        
        // ADO.NET: command.ExecuteReader(), command.ExecuteNonQuery()
        if let Some(recv) = receiver {
            if recv == "command" || recv == "cmd" || recv == "_command" || recv.ends_with("Command") {
                let is_adonet = matches!(callee,
                    "ExecuteReader" | "ExecuteReaderAsync" | "ExecuteNonQuery" | "ExecuteNonQueryAsync" |
                    "ExecuteScalar" | "ExecuteScalarAsync" | "ExecuteXmlReader" | "ExecuteXmlReaderAsync"
                );
                if is_adonet {
                    let operation = match callee {
                        "ExecuteNonQuery" | "ExecuteNonQueryAsync" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.95,
                        framework: Some("ado-net".to_string()),
                    });
                }
            }
        }
        
        // Npgsql: command.ExecuteNonQuery(), NpgsqlCommand
        // Already covered by ADO.NET pattern above since Npgsql implements ADO.NET interfaces
        
        // =========================================================================
        // PHP ORMs
        // =========================================================================
        
        // Laravel Eloquent: Model::find(), Model::create(), $model->save()
        if let Some(recv) = receiver {
            // Static calls: User::find(), User::where()
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_eloquent = matches!(callee,
                    "find" | "findOrFail" | "first" | "firstOrFail" | "get" | "all" |
                    "where" | "whereIn" | "whereBetween" | "orderBy" | "limit" |
                    "create" | "insert" | "update" | "delete" | "destroy" |
                    "save" | "updateOrCreate" | "firstOrCreate" | "upsert"
                );
                if is_eloquent {
                    let operation = match callee {
                        "create" | "insert" | "update" | "save" | "updateOrCreate" | "firstOrCreate" | "upsert" => DataOperation::Write,
                        "delete" | "destroy" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("eloquent".to_string()),
                    });
                }
            }
            
            // Query builder: DB::table('users')
            if recv == "DB" && callee == "table" {
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation: DataOperation::Read,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("laravel-db".to_string()),
                });
            }
        }
        
        // Doctrine: entityManager->find(), repository->findBy()
        if let Some(recv) = receiver {
            if recv == "entityManager" || recv == "em" || recv == "$em" || recv == "$entityManager" {
                let is_doctrine = matches!(callee,
                    "find" | "getReference" | "getPartialReference" | "persist" | "remove" |
                    "merge" | "detach" | "refresh" | "flush" | "clear" |
                    "createQuery" | "createQueryBuilder" | "getRepository"
                );
                if is_doctrine {
                    let operation = match callee {
                        "persist" | "merge" | "flush" => DataOperation::Write,
                        "remove" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("doctrine".to_string()),
                    });
                }
            }
            // Doctrine repository
            if recv.ends_with("Repository") || recv.ends_with("repository") || recv == "$repository" || recv == "$repo" {
                let is_doctrine_repo = matches!(callee,
                    "find" | "findBy" | "findOneBy" | "findAll" | "findById" |
                    "createQueryBuilder" | "count" | "matching"
                );
                if is_doctrine_repo {
                    return Some(DataAccessPoint {
                        table: recv.strip_suffix("Repository").or(recv.strip_suffix("repository")).unwrap_or(recv).to_lowercase(),
                        operation: DataOperation::Read,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("doctrine".to_string()),
                    });
                }
            }
        }
        
        // PDO: $pdo->query(), $stmt->execute()
        if let Some(recv) = receiver {
            if recv == "pdo" || recv == "$pdo" || recv == "db" || recv == "$db" {
                let is_pdo = matches!(callee, "query" | "exec" | "prepare" | "beginTransaction" | "commit" | "rollBack");
                if is_pdo {
                    let operation = match callee {
                        "exec" | "beginTransaction" | "commit" | "rollBack" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.95,
                        framework: Some("pdo".to_string()),
                    });
                }
            }
            // PDO Statement
            if recv == "stmt" || recv == "$stmt" || recv.ends_with("Statement") {
                let is_pdo_stmt = matches!(callee, "execute" | "fetch" | "fetchAll" | "fetchColumn" | "fetchObject" | "rowCount");
                if is_pdo_stmt {
                    let operation = match callee {
                        "execute" => DataOperation::Write, // Could be read or write
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("pdo".to_string()),
                    });
                }
            }
        }
        
        // Yii Active Record: Model::find(), Model::findOne(), $model->save()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_yii = matches!(callee,
                    "find" | "findOne" | "findAll" | "findBySql" | "findByCondition" |
                    "save" | "insert" | "update" | "updateAll" | "delete" | "deleteAll"
                );
                if is_yii {
                    let operation = match callee {
                        "save" | "insert" | "update" | "updateAll" => DataOperation::Write,
                        "delete" | "deleteAll" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.8,
                        framework: Some("yii".to_string()),
                    });
                }
            }
        }
        
        // CakePHP ORM: $table->find(), $table->save(), $table->delete()
        if let Some(recv) = receiver {
            if recv.ends_with("Table") || recv == "$table" || recv == "table" {
                let is_cakephp = matches!(callee,
                    "find" | "findOrCreate" | "get" | "newEntity" | "newEntities" |
                    "save" | "saveMany" | "saveOrFail" | "delete" | "deleteOrFail" | "deleteMany" |
                    "updateAll" | "deleteAll" | "exists"
                );
                if is_cakephp {
                    let operation = match callee {
                        "save" | "saveMany" | "saveOrFail" | "updateAll" | "newEntity" | "newEntities" => DataOperation::Write,
                        "delete" | "deleteOrFail" | "deleteMany" | "deleteAll" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.strip_suffix("Table").unwrap_or(recv).to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("cakephp".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Go ORMs (additional)
        // =========================================================================
        
        // sqlx (Go): db.Select(), db.Get(), db.Exec()
        if receiver == Some("db") || receiver == Some("tx") {
            let is_sqlx = matches!(callee, "Select" | "Get" | "Exec" | "NamedExec" | "Queryx" | "QueryRowx");
            if is_sqlx {
                let operation = match callee {
                    "Exec" | "NamedExec" => DataOperation::Write,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("sqlx-go".to_string()),
                });
            }
        }
        
        // ent (Go): client.User.Query(), client.User.Create()
        if let Some(recv) = receiver {
            if recv.starts_with("client.") || recv.starts_with("tx.") {
                let is_ent = matches!(callee,
                    "Query" | "QueryContext" | "Get" | "GetX" | "First" | "FirstX" | "Only" | "OnlyX" |
                    "Create" | "CreateBulk" | "Update" | "UpdateOne" | "UpdateOneID" |
                    "Delete" | "DeleteOne" | "DeleteOneID" | "All" | "Count" | "Exist"
                );
                if is_ent {
                    let operation = match callee {
                        "Create" | "CreateBulk" | "Update" | "UpdateOne" | "UpdateOneID" => DataOperation::Write,
                        "Delete" | "DeleteOne" | "DeleteOneID" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    // Extract table from receiver like "client.User" -> "user"
                    let table = recv.split('.').nth(1).unwrap_or("unknown").to_lowercase();
                    return Some(DataAccessPoint {
                        table,
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("ent".to_string()),
                    });
                }
            }
        }
        
        // bun (Go): db.NewSelect(), db.NewInsert(), db.NewUpdate()
        if receiver == Some("db") || receiver == Some("tx") {
            let is_bun = matches!(callee, 
                "NewSelect" | "NewInsert" | "NewUpdate" | "NewDelete" | "NewCreateTable" | "NewDropTable" |
                "NewRaw" | "NewValues" | "NewMerge"
            );
            if is_bun {
                let operation = match callee {
                    "NewInsert" | "NewUpdate" | "NewCreateTable" | "NewMerge" => DataOperation::Write,
                    "NewDelete" | "NewDropTable" => DataOperation::Delete,
                    _ => DataOperation::Read,
                };
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.9,
                    framework: Some("bun".to_string()),
                });
            }
        }
        
        // pgx (Go): conn.Query(), conn.Exec(), pool.Query()
        if let Some(recv) = receiver {
            if recv == "conn" || recv == "pool" || recv.ends_with("Conn") || recv.ends_with("Pool") {
                let is_pgx = matches!(callee,
                    "Query" | "QueryRow" | "QueryFunc" | "Exec" | "SendBatch" |
                    "Begin" | "BeginTx" | "CopyFrom" | "Prepare"
                );
                if is_pgx {
                    let operation = match callee {
                        "Exec" | "CopyFrom" | "SendBatch" => DataOperation::Write,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.9,
                        framework: Some("pgx".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Rust ORMs (additional)
        // =========================================================================
        
        // sqlx (Rust): sqlx::query(), sqlx::query_as()
        if callee == "query" || callee == "query_as" || callee == "query_scalar" {
            if receiver.map_or(false, |r| r.contains("sqlx")) {
                return Some(DataAccessPoint {
                    table: "unknown".to_string(),
                    operation: DataOperation::Read,
                    fields: Vec::new(),
                    file: file.to_string(),
                    line: call.range.start.line,
                    confidence: 0.85,
                    framework: Some("sqlx-rust".to_string()),
                });
            }
        }
        
        // SeaORM: Entity::find(), Entity::insert(), Entity::update()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_seaorm = matches!(callee, 
                    "find" | "find_by_id" | "insert" | "update" | "delete" | "delete_by_id" |
                    "insert_many" | "update_many" | "delete_many"
                );
                if is_seaorm {
                    let operation = match callee {
                        "insert" | "insert_many" | "update" | "update_many" => DataOperation::Write,
                        "delete" | "delete_by_id" | "delete_many" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("seaorm".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Kotlin ORMs
        // =========================================================================
        
        // Exposed: transaction { }, Table.select(), Table.insert()
        if callee == "transaction" && receiver.is_none() {
            return Some(DataAccessPoint {
                table: "unknown".to_string(),
                operation: DataOperation::Read,
                fields: Vec::new(),
                file: file.to_string(),
                line: call.range.start.line,
                confidence: 0.8,
                framework: Some("exposed".to_string()),
            });
        }
        
        // Exposed table operations
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_exposed = matches!(callee,
                    "select" | "selectAll" | "selectBatched" | "insert" | "insertAndGetId" |
                    "batchInsert" | "update" | "upsert" | "deleteWhere" | "deleteAll" |
                    "insertIgnore" | "insertIgnoreAndGetId" | "replace"
                );
                if is_exposed {
                    let operation = match callee {
                        "insert" | "insertAndGetId" | "batchInsert" | "update" | "upsert" |
                        "insertIgnore" | "insertIgnoreAndGetId" | "replace" => DataOperation::Write,
                        "deleteWhere" | "deleteAll" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("exposed".to_string()),
                    });
                }
            }
        }
        
        // ktorm: database.from(), database.insert(), Entity.find()
        if let Some(recv) = receiver {
            if recv == "database" || recv == "db" {
                let is_ktorm = matches!(callee, "from" | "insert" | "update" | "delete" | "batchInsert" | "batchUpdate");
                if is_ktorm {
                    let operation = match callee {
                        "insert" | "update" | "batchInsert" | "batchUpdate" => DataOperation::Write,
                        "delete" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: "unknown".to_string(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.85,
                        framework: Some("ktorm".to_string()),
                    });
                }
            }
        }
        
        // =========================================================================
        // Ruby ORMs (limited parsing but common patterns)
        // =========================================================================
        
        // ActiveRecord: Model.find(), Model.where(), Model.create()
        if let Some(recv) = receiver {
            if recv.chars().next().map_or(false, |c| c.is_uppercase()) {
                let is_activerecord = matches!(callee,
                    "find" | "find_by" | "find_by!" | "find_or_create_by" | "find_or_initialize_by" |
                    "where" | "all" | "first" | "last" | "take" | "pluck" | "select" |
                    "create" | "create!" | "new" | "build" | "save" | "save!" |
                    "update" | "update!" | "update_all" | "update_attribute" | "update_attributes" |
                    "destroy" | "destroy!" | "destroy_all" | "delete" | "delete_all" |
                    "includes" | "joins" | "left_joins" | "eager_load" | "preload"
                );
                if is_activerecord {
                    let operation = match callee {
                        "create" | "create!" | "save" | "save!" | "update" | "update!" | 
                        "update_all" | "update_attribute" | "update_attributes" |
                        "find_or_create_by" => DataOperation::Write,
                        "destroy" | "destroy!" | "destroy_all" | "delete" | "delete_all" => DataOperation::Delete,
                        _ => DataOperation::Read,
                    };
                    return Some(DataAccessPoint {
                        table: recv.to_lowercase(),
                        operation,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: call.range.start.line,
                        confidence: 0.8,
                        framework: Some("activerecord".to_string()),
                    });
                }
            }
        }
        
        None
    }
    
    /// Regex fallback: Detect SQL in raw source (for embedded SQL strings)
    pub fn detect_sql_in_source(&self, source: &str, file: &str) -> Vec<DataAccessPoint> {
        let mut access_points = Vec::new();
        let lines: Vec<&str> = source.lines().collect();
        
        for (i, line) in lines.iter().enumerate() {
            let line_num = (i + 1) as u32;
            
            // Only check lines that look like they contain SQL strings
            if !line.contains("SELECT") && !line.contains("INSERT") && 
               !line.contains("UPDATE") && !line.contains("DELETE") &&
               !line.contains("select") && !line.contains("insert") &&
               !line.contains("update") && !line.contains("delete") {
                continue;
            }
            
            if let Some(caps) = self.sql_select.captures(line) {
                if let Some(table) = caps.get(1) {
                    access_points.push(DataAccessPoint {
                        table: table.as_str().to_string(),
                        operation: DataOperation::Read,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: line_num,
                        confidence: 0.85,
                        framework: Some("sql".to_string()),
                    });
                }
            }
            
            if let Some(caps) = self.sql_insert.captures(line) {
                if let Some(table) = caps.get(1) {
                    access_points.push(DataAccessPoint {
                        table: table.as_str().to_string(),
                        operation: DataOperation::Write,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: line_num,
                        confidence: 0.85,
                        framework: Some("sql".to_string()),
                    });
                }
            }
            
            if let Some(caps) = self.sql_update.captures(line) {
                if let Some(table) = caps.get(1) {
                    access_points.push(DataAccessPoint {
                        table: table.as_str().to_string(),
                        operation: DataOperation::Write,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: line_num,
                        confidence: 0.85,
                        framework: Some("sql".to_string()),
                    });
                }
            }
            
            if let Some(caps) = self.sql_delete.captures(line) {
                if let Some(table) = caps.get(1) {
                    access_points.push(DataAccessPoint {
                        table: table.as_str().to_string(),
                        operation: DataOperation::Delete,
                        fields: Vec::new(),
                        file: file.to_string(),
                        line: line_num,
                        confidence: 0.85,
                        framework: Some("sql".to_string()),
                    });
                }
            }
        }
        
        access_points
    }
    
    /// Combined detection: AST-first, then SQL regex fallback
    pub fn detect(&self, source: &str, file: &str) -> Vec<DataAccessPoint> {
        // For backward compatibility - this method uses regex only
        // Prefer detect_from_ast() when you have ParseResult
        self.detect_sql_in_source(source, file)
    }
}

impl Default for DataAccessDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_detect_sql() {
        let detector = DataAccessDetector::new();
        let source = r#"
            SELECT id, name FROM users WHERE active = true;
            INSERT INTO orders (user_id, total) VALUES (1, 100);
        "#;
        
        let access = detector.detect_sql_in_source(source, "test.sql");
        assert_eq!(access.len(), 2);
        assert_eq!(access[0].table, "users");
        assert_eq!(access[0].operation, DataOperation::Read);
        assert_eq!(access[1].table, "orders");
        assert_eq!(access[1].operation, DataOperation::Write);
    }
}
