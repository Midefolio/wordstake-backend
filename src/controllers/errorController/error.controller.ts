/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Response, Request, RequestHandler } from "express";
import createHttpError, { isHttpError } from "http-errors";

const NotFound:RequestHandler = (req, res, next) => {next(createHttpError(404, "Endpoint not found"))}

const ErrorHandler =(error: unknown, req:Request, res:Response, next:NextFunction) => {
    let errorMessage = "An unknown error occurred"
    let statusCode = 500;
    if(isHttpError(error)) {
      statusCode = error.status;
      errorMessage = error.message;
    }
    res.status(statusCode).json({error:errorMessage})
}

const errorMessage = (code:number, message:string) => {
    if(message && code){
      throw createHttpError(code, message)
    }
}

export { ErrorHandler, NotFound, errorMessage };