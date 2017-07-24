<%@ WebHandler Language="C#" Class="proxy" debug="true"%>
/*
This proxy page does not have any security checks. It is highly recommended
that a user deploying this proxy page on their web server, add appropriate
security checks, for example checking request path, username/password, target
url, etc.
*/

using System;
using System.Drawing;
using System.IO;
using System.Web;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;
using System.Web.Caching;
using System.Net;
using System.Security.Principal;

/// <summary>
/// Forwards requests to an ArcGIS Server REST resource. Uses information in
/// the proxy.config file to determine properties of the server.
/// </summary>
public class proxy : IHttpHandler {

	public void ProcessRequest (HttpContext context) {
		HttpResponse response = context.Response;
        string uri = context.Request.Url.Query.Substring(0).Substring(1);
        int ampPos = uri.LastIndexOf("&");
        if (ampPos > 0){
            uri = uri.Substring(0,ampPos);
        };
			
		//context.Response.Write("<script type='text/javascript'>alert('" + uri + "');</script>");
        System.Net.HttpWebRequest req = (System.Net.HttpWebRequest)System.Net.HttpWebRequest.Create(uri);
		req.Method = context.Request.HttpMethod;
		req.ServicePoint.Expect100Continue = false;
        req.UseDefaultCredentials=true;
		if (context.Request.Headers["Content-Type"] != null){
			req.ContentType = context.Request.Headers["Content-Type"];
		}
		if (context.Request.Headers["SOAPAction"] != null){
			req.Headers["SOAPAction"] = context.Request.Headers["SOAPAction"];
		}
		if (context.Request.Headers["Authorization"] != null){
			req.Headers["Authorization"] = context.Request.Headers["Authorization"];
		}
		
		// Set body of request for POST requests
		if (context.Request.InputStream.Length > 0)
		{
			byte[] bytes = new byte[context.Request.InputStream.Length];
			context.Request.InputStream.Read(bytes, 0, (int)context.Request.InputStream.Length);
			req.ContentLength = bytes.Length;
			
			string ctype = context.Request.ContentType;
			if (String.IsNullOrEmpty(ctype)) {
				req.ContentType = "application/x-www-form-urlencoded";
			}
			else {
				req.ContentType = ctype;
			}

			//context.Response.Write("<script type='text/javascript'>alert('" + req.ContentType + "');</script>");
			
			using (Stream outputStream = req.GetRequestStream())
			{
				outputStream.Write(bytes, 0, bytes.Length);
			}
		}
		
		// Send the request to the server
		System.Net.WebResponse serverResponse = null;
		try
		{
			serverResponse = req.GetResponse();
		}
		catch (System.Net.WebException webExc)
		{
			response.StatusCode = 500;
			response.StatusDescription = webExc.Status.ToString();
			Stream receiveStream = webExc.Response.GetResponseStream();
			StreamReader readStream = new StreamReader(receiveStream, System.Text.Encoding.GetEncoding("utf-8"));
			String readString = readStream.ReadToEnd();
			response.Write(readString);
			response.End();
			return;
		}
		
		// Set up the response to the client
		if (serverResponse != null) {
			response.ContentType = serverResponse.ContentType;
			using (Stream byteStream = serverResponse.GetResponseStream())
			{
				// Text response
				if (serverResponse.ContentType.Contains("text") || 
						serverResponse.ContentType.Contains("json"))
				{
					using (StreamReader sr = new StreamReader(byteStream))
					{
						string strResponse = sr.ReadToEnd();
						response.Write(strResponse);
					}
				}
				else
				{
					try
					{
						// Binary response (image, lyr file, other binary file)
						BinaryReader br = new BinaryReader(byteStream);
						
						byte[] outb = br.ReadBytes((int)serverResponse.ContentLength);
						br.Close();

						// Tell client not to cache the image since it's dynamic
						response.CacheControl = "no-cache";

						// Send the image to the client
						// (Note: if large images/files sent, could modify this to send in chunks)
						response.OutputStream.Write(outb, 0, outb.Length);
					}
					catch
					{
						response.Write("fault");
					}
				}
				serverResponse.Close();
			}
		}
		response.End();
	}

	public bool IsReusable {
		get {
			return false;
		}
	}

	// Gets the token for a server URL from a configuration file
	private string getTokenFromConfigFile(string uri)
	{
		try
		{
			ProxyConfig config = ProxyConfig.GetCurrentConfig();
			if (config != null)
			return config.GetToken(uri);
			else
			throw new ApplicationException(
			"Proxy.config file does not exist at application root, or is not readable.");
		}
		catch (InvalidOperationException)
		{
			// Proxy is being used for an unsupported service (proxy.config has mustMatch="true")
			HttpResponse response = HttpContext.Current.Response;
			response.StatusCode = (int)System.Net.HttpStatusCode.Forbidden;
			response.End();
		}
		catch (Exception e)
		{
			if (e is ApplicationException)
			throw e;
			
			// just return an empty string at this point
			// -- may want to throw an exception, or add to a log file
		}
		
		return string.Empty;
	}
}

[XmlRoot("ProxyConfig")]
public class ProxyConfig
{
	#region Static Members

	private static object _lockobject = new object();

	public static ProxyConfig LoadProxyConfig(string fileName)
	{
		ProxyConfig config = null;

		lock (_lockobject)
		{
			if (System.IO.File.Exists(fileName))
			{
				XmlSerializer reader = new XmlSerializer(typeof(ProxyConfig));
				using (System.IO.StreamReader file = new System.IO.StreamReader(fileName))
				{
					config = (ProxyConfig)reader.Deserialize(file);
				}
			}
		}

		return config;
	}

	public static ProxyConfig GetCurrentConfig()
	{
		ProxyConfig config = HttpRuntime.Cache["proxyConfig"] as ProxyConfig;
		if (config == null)
		{
			string fileName = GetFilename(HttpContext.Current);
			config = LoadProxyConfig(fileName);

			if (config != null)
			{
				CacheDependency dep = new CacheDependency(fileName);
				HttpRuntime.Cache.Insert("proxyConfig", config, dep);
			}
		}

		return config;
	}

	public static string GetFilename(HttpContext context)
	{
		return context.Server.MapPath("~/proxy.config");
	}
	#endregion

	ServerUrl[] serverUrls;
	bool mustMatch;

	[XmlArray("serverUrls")]
	[XmlArrayItem("serverUrl")]
	public ServerUrl[] ServerUrls
	{
		get { return this.serverUrls; }
		set { this.serverUrls = value; }
	}

	[XmlAttribute("mustMatch")]
	public bool MustMatch
	{
		get { return mustMatch; }
		set { mustMatch = value; }
	}

	public string GetToken(string uri)
	{
		foreach (ServerUrl su in serverUrls)
		{
			if (su.MatchAll && uri.StartsWith(su.Url, StringComparison.InvariantCultureIgnoreCase))
			{
				return su.Token;
			}
			else
			{
				if (String.Compare(uri, su.Url, StringComparison.InvariantCultureIgnoreCase) == 0)
				return su.Token;
			}
		}

		if (mustMatch)
		throw new InvalidOperationException();

		return string.Empty;
	}
}

public class ServerUrl
{
	string url;
	bool matchAll;
	string token;

	[XmlAttribute("url")]
	public string Url
	{
		get { return url; }
		set { url = value; }
	}

	[XmlAttribute("matchAll")]
	public bool MatchAll
	{
		get { return matchAll; }
		set { matchAll = value; }
	}

	[XmlAttribute("token")]
	public string Token
	{
		get { return token; }
		set { token = value; }
	}
}